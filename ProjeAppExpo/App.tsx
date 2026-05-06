import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import {LinearGradient} from 'expo-linear-gradient';
import {Audio} from 'expo-av';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

type Priority = 'Dusuk' | 'Orta' | 'Yuksek';
type Category =
  | 'Odev'
  | 'Sunum'
  | 'Gelistirme'
  | 'Ders Calisma'
  | 'Proje'
  | 'Rapor';
type FilterType = 'Tum' | 'Aktif' | 'Tamamlanan';
type TabType = 'Gorevler' | 'Takvim' | 'Profil';

type Task = {
  id: string;
  title: string;
  description: string;
  dueDateLabel: string;
  dueDateISO: string | null;
  category: Category;
  priority: Priority;
  completed: boolean;
  createdAt: number;
};

const PRIORITIES: Priority[] = ['Dusuk', 'Orta', 'Yuksek'];
const CATEGORIES: Category[] = [
  'Odev',
  'Sunum',
  'Gelistirme',
  'Ders Calisma',
  'Proje',
  'Rapor',
];
const FILTERS: FilterType[] = ['Tum', 'Aktif', 'Tamamlanan'];
const TABS: TabType[] = ['Gorevler', 'Takvim', 'Profil'];
const PRIORITY_RANK: Record<Priority, number> = {Yuksek: 3, Orta: 2, Dusuk: 1};

const formatDateLabel = (date: Date) => {
  const day = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const formatDateTimeLabel = (date: Date) => {
  const dateStr = formatDateLabel(date);
  const hours = `${date.getHours()}`.padStart(2, '0');
  const mins = `${date.getMinutes()}`.padStart(2, '0');
  return `${dateStr} ${hours}:${mins}`;
};

const scheduleReminders = async (task: Task) => {
  if (!task.dueDateISO) return;
  const dueDate = new Date(task.dueDateISO);
  const oneDayBefore = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
  const oneHourBefore = new Date(dueDate.getTime() - 60 * 60 * 1000);

  if (oneDayBefore.getTime() > Date.now()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📅 Gorev Hatirlatici - 1 Gun Kaldi!',
        body: `"${task.title}" gorevine son 1 gun kaldi!`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: oneDayBefore,
      },
    });
  }

  if (oneHourBefore.getTime() > Date.now()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Gorev Hatirlatici - 1 Saat Kaldi!',
        body: `"${task.title}" gorevine son 1 SAAT kaldi! Harekete gec!`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: oneHourBefore,
      },
    });
  }
};

export default function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('Gorevler');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<Priority>('Orta');
  const [selectedCategory, setSelectedCategory] = useState<Category>('Odev');
  const [activeFilter, setActiveFilter] = useState<FilterType>('Tum');
  const [selectedDueDate, setSelectedDueDate] = useState<Date | null>(null);
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const soundRef = useRef<Audio.Sound | null>(null);
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 'seed-1',
      title: 'Algoritma odevi',
      description: 'Dinamik programlama sorularini coz',
      dueDateLabel: '14.05.2026',
      dueDateISO: new Date(2026, 4, 14).toISOString(),
      category: 'Odev',
      priority: 'Yuksek',
      completed: false,
      createdAt: Date.now() - 10000,
    },
    {
      id: 'seed-2',
      title: 'Proje sunum taslagi',
      description: '12 slaytlik ilk versiyonu hazirla',
      dueDateLabel: '20.05.2026',
      dueDateISO: new Date(2026, 4, 20).toISOString(),
      category: 'Sunum',
      priority: 'Orta',
      completed: true,
      createdAt: Date.now() - 5000,
    },
  ]);

  useEffect(() => {
    const requestPermission = async () => {
      const {status} = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Bildirim izni gerekli',
          '1 gun once hatirlatma icin bildirim izni vermelisin.',
        );
      }
    };
    void requestPermission();
  }, []);

  const playAddSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const {sound} = await Audio.Sound.createAsync(
        require('./assets/add_sound.wav'),
      );
      soundRef.current = sound;
      await sound.playAsync();
    } catch (_e) {
      // ses calmazsa sessizce devam et
    }
  };

  const triggerSparkle = () => {
    sparkleAnim.setValue(0);
    Animated.sequence([
      Animated.timing(sparkleAnim, {toValue: 1, duration: 200, useNativeDriver: true}),
      Animated.timing(sparkleAnim, {toValue: 0, duration: 600, useNativeDriver: true}),
    ]).start();
  };

  const addTask = async () => {
    const safeTitle = title.trim();
    const safeDescription = description.trim();

    if (!safeTitle) {
      Alert.alert('Eksik bilgi', 'Lutfen gorev basligi gir.');
      return;
    }

    const newTask: Task = {
      id: `${Date.now()}-${Math.random()}`,
      title: safeTitle,
      description: safeDescription || 'Aciklama belirtilmedi',
      dueDateLabel: selectedDueDate ? formatDateTimeLabel(selectedDueDate) : 'Tarih secilmedi',
      dueDateISO: selectedDueDate ? selectedDueDate.toISOString() : null,
      category: selectedCategory,
      priority: selectedPriority,
      completed: false,
      createdAt: Date.now(),
    };

    setTasks(prev => [newTask, ...prev]);
    setTitle('');
    setDescription('');
    setSelectedDueDate(null);

    void playAddSound();
    triggerSparkle();

    try {
      await scheduleReminders(newTask);
    } catch {
      Alert.alert('Uyari', 'Bildirim zamanlanirken bir sorun olustu.');
    }
  };

  const toggleTaskStatus = (id: string) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === id ? {...task, completed: !task.completed} : task,
      ),
    );
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const visibleTasks = useMemo(() => {
    const filtered =
      activeFilter === 'Aktif'
        ? tasks.filter(task => !task.completed)
        : activeFilter === 'Tamamlanan'
          ? tasks.filter(task => task.completed)
          : tasks;

    return [...filtered].sort((a, b) => {
      const byPriority = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
      if (byPriority !== 0) {
        return byPriority;
      }
      return b.createdAt - a.createdAt;
    });
  }, [activeFilter, tasks]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const active = total - completed;
    return {total, completed, active};
  }, [tasks]);

  const upcomingTasks = useMemo(
    () =>
      tasks
        .filter(task => !task.completed && task.dueDateISO)
        .sort((a, b) => {
          const timeA = new Date(a.dueDateISO || 0).getTime();
          const timeB = new Date(b.dueDateISO || 0).getTime();
          return timeA - timeB;
        }),
    [tasks],
  );

  const renderChip = (
    label: string,
    isActive: boolean,
    onPress: () => void,
    accent?: boolean,
  ) => (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        isActive && styles.chipActive,
        accent && styles.chipAccent,
        isActive && accent && styles.chipAccentActive,
      ]}>
      <Text
        style={[
          styles.chipText,
          isActive && styles.chipTextActive,
          accent && styles.chipAccentText,
          isActive && accent && styles.chipAccentTextActive,
        ]}>
        {label}
      </Text>
    </Pressable>
  );

  const getPriorityTagStyle = (priority: Priority) => {
    if (priority === 'Yuksek') {
      return {bg: '#FFD9DE', text: '#A32739'};
    }
    if (priority === 'Orta') {
      return {bg: '#FFE9BF', text: '#9B5D00'};
    }
    return {bg: '#DFF6E8', text: '#176942'};
  };

  const renderTaskTab = () => (
    <FlatList
      data={visibleTasks}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View>
          <LinearGradient
            colors={['#7D5CFF', '#A78BFA', '#FFE869']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.heroCard}>
            <View style={styles.heroRow}>
              <Image
                source={require('./logo.png')}
                style={styles.heroLogo}
                resizeMode="contain"
              />
              <View style={styles.heroTextBlock}>
                <Text style={styles.heroTitle}>Kampus Gorev Takip</Text>
                <Text style={styles.heroSubtitle}>
                  Pinterest hissiyle planla, onceliklendir ve odakta kal.
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Toplam</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.active}</Text>
              <Text style={styles.statLabel}>Aktif</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.completed}</Text>
              <Text style={styles.statLabel}>Tamamlanan</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Yeni Gorev Ekle</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Gorev basligi"
              placeholderTextColor={colors.placeholder}
              style={styles.input}
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Kisa aciklama"
              placeholderTextColor={colors.placeholder}
              style={[styles.input, styles.textArea]}
              multiline
            />

            <Pressable style={styles.dateButton} onPress={() => setPickerMode('date')}>
              <Text style={styles.dateButtonText}>
                {selectedDueDate
                  ? `📅 ${formatDateTimeLabel(selectedDueDate)}`
                  : '📅 Tarih & Saat Sec'}
              </Text>
            </Pressable>

            <Text style={styles.fieldLabel}>Kategori sec</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map(item =>
                renderChip(
                  item,
                  selectedCategory === item,
                  () => setSelectedCategory(item),
                ),
              )}
            </View>

            <Text style={styles.fieldLabel}>Oncelik sec</Text>
            <View style={styles.chipRow}>
              {PRIORITIES.map(item =>
                renderChip(
                  item,
                  selectedPriority === item,
                  () => setSelectedPriority(item),
                  true,
                ),
              )}
            </View>

            <Pressable style={styles.addButton} onPress={() => void addTask()}>
              <Text style={styles.addButtonText}>Gorev Ekle + Hatirlatma Kur</Text>
            </Pressable>
          </View>

          <Text style={styles.infoLine}>
            Liste otomatik olarak: Yuksek {'>'} Orta {'>'} Dusuk siralanir.
          </Text>

          <View style={styles.filterRow}>
            {FILTERS.map(filter =>
              renderChip(filter, activeFilter === filter, () => setActiveFilter(filter)),
            )}
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Bu filtrede gorev bulunamadi</Text>
          <Text style={styles.emptySub}>
            Yeni bir gorev ekleyebilir veya filtreyi degistirebilirsin.
          </Text>
        </View>
      }
      renderItem={({item}) => {
        const priorityTag = getPriorityTagStyle(item.priority);
        return (
          <View style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <Text style={styles.badge}>{item.category}</Text>
              <Text
                style={[
                  styles.priority,
                  {backgroundColor: priorityTag.bg, color: priorityTag.text},
                ]}>
                {item.priority}
              </Text>
            </View>
            <Text style={[styles.taskTitle, item.completed && styles.completedText]}>
              {item.title}
            </Text>
            <Text style={styles.taskDescription}>{item.description}</Text>
            <Text style={styles.dueText}>Son tarih: {item.dueDateLabel}</Text>

            <View style={styles.taskActions}>
              <Pressable
                style={[styles.actionButton, styles.completeButton]}
                onPress={() => toggleTaskStatus(item.id)}>
                <Text style={styles.actionButtonText}>
                  {item.completed ? 'Geri Al' : 'Tamamla'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => deleteTask(item.id)}>
                <Text style={styles.actionButtonText}>Sil</Text>
              </Pressable>
            </View>
          </View>
        );
      }}
    />
  );

  const renderCalendarTab = () => (
    <View style={styles.staticTabContainer}>
      <Text style={styles.tabTitle}>Takvim ve Hatirlatma</Text>
      <Text style={styles.tabDescription}>
        Tarih secilen aktif gorevler burada. Uygulama, son tarihten 1 gun once bildirim
        planlar.
      </Text>
      {upcomingTasks.length === 0 ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Planlanan gorev yok</Text>
          <Text style={styles.infoBody}>Gorevler sekmesinden tarih secerek ekleyebilirsin.</Text>
        </View>
      ) : (
        upcomingTasks.map(task => (
          <View key={task.id} style={styles.infoCard}>
            <Text style={styles.infoTitle}>{task.title}</Text>
            <Text style={styles.infoBody}>Tarih: {task.dueDateLabel}</Text>
            <Text style={styles.infoBody}>Oncelik: {task.priority}</Text>
          </View>
        ))
      )}
    </View>
  );

  const renderProfileTab = () => (
    <View style={styles.staticTabContainer}>
      <Text style={styles.tabTitle}>Profil ve Ozet</Text>
      <Text style={styles.tabDescription}>
        Kendin icin kullanim odakli mini analiz kartlari.
      </Text>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Tamamlanma orani</Text>
        <Text style={styles.infoBody}>
          %{stats.total === 0 ? 0 : Math.round((stats.completed / stats.total) * 100)}
        </Text>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Aktif gorev odagi</Text>
        <Text style={styles.infoBody}>
          Yuksek oncelikli aktif gorev sayisi:{' '}
          {tasks.filter(t => !t.completed && t.priority === 'Yuksek').length}
        </Text>
      </View>
    </View>
  );

  const renderActiveTab = () => {
    if (activeTab === 'Takvim') {
      return renderCalendarTab();
    }
    if (activeTab === 'Profil') {
      return renderProfileTab();
    }
    return renderTaskTab();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <View style={styles.main}>{renderActiveTab()}</View>
      <LinearGradient
        colors={['#FFFFFF', '#F5EEFF']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.tabBar}>
        {TABS.map(tab => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}>
            <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </LinearGradient>

      {pickerMode === 'date' && (
        <DateTimePicker
          value={selectedDueDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={new Date()}
          onChange={(event, date) => {
            if (event.type === 'set' && date) {
              setSelectedDueDate(date);
              setPickerMode('time');
            } else {
              setPickerMode(null);
            }
          }}
        />
      )}

      {pickerMode === 'time' && (
        <DateTimePicker
          value={selectedDueDate || new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setPickerMode(null);
            if (event.type === 'set' && date) {
              setSelectedDueDate(date);
            }
          }}
        />
      )}

      {/* Pariltı / Sparkle Overlay */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.sparkleOverlay,
          {
            opacity: sparkleAnim,
            transform: [{
              scale: sparkleAnim.interpolate({inputRange: [0, 0.5, 1], outputRange: [0.95, 1.05, 1]}),
            }],
          },
        ]}>
        <LinearGradient
          colors={['#FFE86988', '#FF9FD488', '#A78BFA88', '#FFE86988']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.sparkleGradient}>
          <Text style={styles.sparkleEmoji}>✨ 🌟 ✨</Text>
          <Text style={styles.sparkleText}>Gorev Eklendi!</Text>
          <Text style={styles.sparkleEmoji}>✨ 🌟 ✨</Text>
        </LinearGradient>
      </Animated.View>
    </SafeAreaView>
  );
}

const colors = {
  bg: '#F8F4FF',
  card: '#FFFFFF',
  purple: '#7C4DFF',
  purpleSoft: '#ECE3FF',
  lemon: '#FFF7BA',
  lemonStrong: '#FFE56E',
  text: '#2A2142',
  textMuted: '#6D6586',
  border: '#E9E0FF',
  danger: '#FF6B7A',
  placeholder: '#9A91B8',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  main: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 110,
  },
  heroCard: {
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroLogo: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  heroTextBlock: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 12,
    color: '#F8F5FF',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    shadowColor: '#8A69FF',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 4},
    elevation: 3,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.purple,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#A78BFA',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 5},
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: '#FCFAFF',
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  textArea: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: '#F3EBFF',
    borderColor: '#D7C8FF',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  dateButtonText: {
    color: '#58409E',
    fontWeight: '700',
    fontSize: 13,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: 7,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: colors.purpleSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.purple,
    borderColor: colors.purple,
  },
  chipText: {
    color: colors.purple,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipAccent: {
    backgroundColor: colors.lemon,
    borderColor: '#F3DF6C',
  },
  chipAccentActive: {
    backgroundColor: colors.lemonStrong,
    borderColor: colors.lemonStrong,
  },
  chipAccentText: {
    color: '#6E5A00',
  },
  chipAccentTextActive: {
    color: '#4A3C00',
  },
  addButton: {
    marginTop: 8,
    backgroundColor: colors.purple,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  infoLine: {
    fontSize: 12,
    color: '#7D5CC6',
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 2,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 13,
    marginBottom: 10,
    shadowColor: '#9D7DFF',
    shadowOpacity: 0.12,
    shadowRadius: 9,
    shadowOffset: {width: 0, height: 4},
    elevation: 3,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  badge: {
    backgroundColor: colors.purpleSoft,
    color: colors.purple,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '700',
  },
  priority: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: '700',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  taskDescription: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 6,
  },
  dueText: {
    fontSize: 12,
    color: colors.purple,
    marginBottom: 10,
    fontWeight: '600',
  },
  taskActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  completeButton: {
    backgroundColor: colors.purple,
  },
  deleteButton: {
    backgroundColor: colors.danger,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  staticTabContainer: {
    flex: 1,
    padding: 16,
    paddingBottom: 100,
  },
  tabTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  tabDescription: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 14,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  infoTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 3,
  },
  infoBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabButtonActive: {
    backgroundColor: colors.purpleSoft,
  },
  tabButtonText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: colors.purple,
  },
  sparkleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkleGradient: {
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 48,
    alignItems: 'center',
    shadowColor: '#FFE869',
    shadowOpacity: 0.6,
    shadowRadius: 30,
    shadowOffset: {width: 0, height: 0},
    elevation: 20,
  },
  sparkleEmoji: {
    fontSize: 30,
    marginVertical: 4,
  },
  sparkleText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4A3C00',
    marginVertical: 6,
    letterSpacing: 0.5,
  },
});
