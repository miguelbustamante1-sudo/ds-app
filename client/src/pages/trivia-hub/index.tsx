import { HubPage } from '@/components/hub/HubPage';
import { triviaHubConfig } from '@/config/hubs/trivia.hub.config';

/**
 * Trivia Hub Landing Page
 * Route: /trivia-hub
 * Guard: 'admin' role required (enforced at the button level in triviaHubConfig)
 */
export default function TriviaHubPage() {
  return <HubPage config={triviaHubConfig} />;
}
