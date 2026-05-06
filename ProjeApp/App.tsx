import React, {useMemo, useState} from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type Priority = 'Dusuk' | 'Orta' | 'Yuksek';
type Category = 'Yazilim' | 'Tasarim' | 'Sunum' | 'Arastirma';
type FilterType = 'Tum' | 'Aktif' | 'Tamamlanan';

type Task = {
  id: string;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  completed: boolean;
};

const PRIORITIES: Priority[] = ['Dusuk', 'Orta', 'Yuksek'];
const CATEGORIES: Category[] = ['Yazilim', 'Tasarim', 'Sunum', 'Arastirma'];
const FILTERS: FilterType[] = ['Tum', 'Aktif', 'Tamamlanan'];

function App(): React.JSX.Element {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<Priority>('Orta');
  const [selectedCategory, setSelectedCategory] = useState<Category>('Yazilim');
  const [activeFilter, setActiveFilter] = useState<FilterType>('Tum');
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 'seed-1',
      title: 'Mobil proje wireframe',
      description: 'Ana ekran yerlesimini ciz',
      category: 'Tasarim',
      priority: 'Orta',
      completed: false,
    },
    {
      id: 'seed-2',
      title: 'API notlari',
      description: 'Ders icin endpoint listesi hazirla',
      category: 'Arastirma',
      priority: 'Yuksek',
      completed: true,
    },
  ]);

  const addTask = () => {
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
      category: selectedCategory,
      priority: selectedPriority,
      completed: false,
    };

    setTasks(prev => [newTask, ...prev]);
    setTitle('');
    setDescription('');
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
    if (activeFilter === 'Aktif') {
      return tasks.filter(task => !task.completed);
    }

    if (activeFilter === 'Tamamlanan') {
      return tasks.filter(task => task.completed);
    }

    return tasks;
  }, [activeFilter, tasks]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const active = total - completed;
    return {total, completed, active};
  }, [tasks]);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <FlatList
        data={visibleTasks}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>Kampus Gorev Takip</Text>
            <Text style={styles.subtitle}>
              Gorev ekle, oncelik ver, tamamla ve filtrele.
            </Text>

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
              <Text style={styles.cardTitle}>Yeni Ders Gorevi</Text>
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

              <Pressable style={styles.addButton} onPress={addTask}>
                <Text style={styles.addButtonText}>Gorev Ekle</Text>
              </Pressable>
            </View>

            <View style={styles.filterRow}>
              {FILTERS.map(filter =>
                renderChip(
                  filter,
                  activeFilter === filter,
                  () => setActiveFilter(filter),
                ),
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
        renderItem={({item}) => (
          <View style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <Text style={styles.badge}>{item.category}</Text>
              <Text style={styles.priority}>{item.priority}</Text>
            </View>
            <Text style={[styles.taskTitle, item.completed && styles.completedText]}>
              {item.title}
            </Text>
            <Text style={styles.taskDescription}>{item.description}</Text>

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
        )}
      />
    </SafeAreaView>
  );
}

const colors = {
  bg: '#F5F1FF',
  card: '#FFFFFF',
  purple: '#7C4DFF',
  purpleSoft: '#E8DEFF',
  lemon: '#FFF7B0',
  lemonStrong: '#FFE763',
  text: '#2A2142',
  textMuted: '#6D6586',
  border: '#E2D9FF',
  danger: '#FF6B7A',
  placeholder: '#9A91B8',
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 16,
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
    marginBottom: 14,
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
    backgroundColor: '#FAF8FF',
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
    backgroundColor: colors.lemon,
    color: '#6E5A00',
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
    marginBottom: 11,
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
});

export default App;
