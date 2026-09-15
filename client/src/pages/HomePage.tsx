import { getStoredUser } from '../lib/api';
import { ViewerDashboard } from '../components/dashboard/ViewerDashboard';
import { InstructorDashboard } from '../components/dashboard/InstructorDashboard';

/**
 * The dashboard at "/". Renders a role-specific experience: instructors get a
 * teaching cockpit (their sessions, reach, go-live actions), viewers get a
 * learner home (what to join, progress, achievements). Browsing/discovering
 * sessions now lives on its own page at "/live".
 */
export function HomePage() {
  const user = getStoredUser();
  return user?.role === 'INSTRUCTOR' ? <InstructorDashboard /> : <ViewerDashboard />;
}
