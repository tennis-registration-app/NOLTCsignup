import { Calendar, GraduationCap, Trophy, Star } from '../components';

export function getEventIcon(type) {
  switch (type) {
    case 'league':
      return Trophy;
    case 'tournament':
      return Star;
    case 'clinic':
      return GraduationCap;
    default:
      return Calendar;
  }
}
