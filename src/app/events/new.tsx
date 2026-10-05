import { EventForm } from '@/components/event-form/EventForm';
import { emptyEventForm } from '@/lib/events';

export default function NewEventScreen() {
  return <EventForm initial={emptyEventForm()} />;
}
