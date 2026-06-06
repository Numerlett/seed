import { Tabs } from 'expo-router';
import {
  LayoutGrid,
  Home,
  Package,
  Receipt,
  ShoppingBag,
} from 'lucide-react-native';
import React from 'react';

import { AppHeader } from '../../components/AppHeader';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        header: () => <AppHeader />,
        tabBarActiveTintColor: '#1c1917',
        tabBarInactiveTintColor: '#a8a29e',
        tabBarStyle: {
          borderTopColor: '#e7e5e4',
        },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color, size }) => <Package color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Sales',
          tabBarIcon: ({ color, size }) => <Receipt color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="purchases"
        options={{
          title: 'Purchases',
          tabBarIcon: ({ color, size }) => (
            <ShoppingBag color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <LayoutGrid color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
