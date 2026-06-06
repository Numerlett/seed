import { Search } from 'lucide-react-native';
import React from 'react';
import { FlatList, RefreshControl, TextInput, View } from 'react-native';

import { Empty, ErrorState, Fab, Spinner } from './ui';

interface ListScreenProps<T> {
  data: T[];
  renderItem: (item: T) => React.ReactElement;
  keyExtractor: (item: T) => string;
  loading?: boolean;
  refetching?: boolean;
  onRefresh?: () => void;
  errorMessage?: string;
  onRetry?: () => void;
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  };
  header?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  onAdd?: () => void;
}

export function ListScreen<T>({
  data,
  renderItem,
  keyExtractor,
  loading,
  refetching,
  onRefresh,
  errorMessage,
  onRetry,
  search,
  header,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  onAdd,
}: ListScreenProps<T>) {
  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={({ item }) => renderItem(item)}
        ItemSeparatorComponent={() => <View className="h-2.5" />}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View className="gap-3 pb-3">
            {search ? (
              <View className="h-11 flex-row items-center gap-2 rounded-xl border border-input bg-background px-3">
                <Search size={18} color="#a8a29e" />
                <TextInput
                  value={search.value}
                  onChangeText={search.onChange}
                  placeholder={search.placeholder ?? 'Search…'}
                  placeholderTextColor="#a8a29e"
                  className="h-11 flex-1 text-base text-foreground"
                />
              </View>
            ) : null}
            {header}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <Spinner />
          ) : errorMessage ? (
            <ErrorState message={errorMessage} onRetry={onRetry} />
          ) : (
            <Empty
              title={emptyTitle}
              description={emptyDescription}
              icon={emptyIcon}
            />
          )
        }
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refetching} onRefresh={onRefresh} />
          ) : undefined
        }
      />
      {onAdd ? <Fab onPress={onAdd} /> : null}
    </View>
  );
}
