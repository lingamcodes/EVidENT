import { router } from 'expo-router';
import { TabList, Tabs, TabSlot, TabTrigger } from 'expo-router/ui';

import { CreateButton, TabBar, TabBarItem } from './TabBar';

/** Bottom navigation from the design: Home · Explore · (+) · Planner · You. */
export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot />
      <TabList asChild>
        <TabBar>
          <TabTrigger name="index" href="/" asChild>
            <TabBarItem label="Home" icon={{ ios: 'house.fill', android: 'home' }} />
          </TabTrigger>
          <TabTrigger name="explore" href="/explore" asChild>
            <TabBarItem label="Explore" icon={{ ios: 'magnifyingglass', android: 'search' }} />
          </TabTrigger>
          <CreateButton onPress={() => router.push('/events/new')} />
          <TabTrigger name="planner" href="/planner" asChild>
            <TabBarItem label="Planner" icon={{ ios: 'calendar', android: 'calendar_month' }} />
          </TabTrigger>
          <TabTrigger name="you" href="/you" asChild>
            <TabBarItem label="You" icon={{ ios: 'person.crop.circle', android: 'account_circle' }} />
          </TabTrigger>
        </TabBar>
      </TabList>
    </Tabs>
  );
}
