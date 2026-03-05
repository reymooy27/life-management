import * as Notifications from 'expo-notifications';
import {
    cancelExerciseReminders,
    cancelWaterReminders,
    initNotifications,
    scheduleExerciseReminders,
    scheduleWaterReminders,
} from '../notificationService';

jest.mock('expo-notifications');
jest.mock('../../../db/database');

import { getUserSettings } from '../../../db/database';

describe('notificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock returns
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([]);
  });

  describe('Water Reminders', () => {
    it('cancels existing water reminders', async () => {
      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([
        { identifier: 'water-reminder-0' },
        { identifier: 'water-reminder-1' },
         // something else we shouldn't cancel
        { identifier: 'exercise-morning' },
      ]);

      await cancelWaterReminders();

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('water-reminder-0');
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('water-reminder-1');
    });

    it('schedules correct number of daily triggers based on interval', async () => {
      // 7 AM to 9 PM is 14 hours difference.
      // If interval is 2 hours, triggers will be at:
      // 7, 9, 11, 13, 15, 17, 19, 21 => 8 instances (indices 0 to 7)
      await scheduleWaterReminders(2, true);

      // Verify request permissions was called
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();

      // Verify clear logic was executed (even though mocked empty)
      expect(Notifications.getAllScheduledNotificationsAsync).toHaveBeenCalled();

      // Ensure 8 schedule calls happened
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(8);

      // Check first trigger (7 AM)
      expect(Notifications.scheduleNotificationAsync).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          identifier: 'water-reminder-0',
          trigger: expect.objectContaining({
            hour: 7,
            minute: 0,
          }),
        })
      );

      // Check last trigger (9 PM == 21)
      expect(Notifications.scheduleNotificationAsync).toHaveBeenNthCalledWith(
        8,
        expect.objectContaining({
          identifier: 'water-reminder-7',
          trigger: expect.objectContaining({
            hour: 21,
            minute: 0,
          }),
        })
      );
    });

    it('handles negative or partial hour intervals gracefully (e.g. 1.5 hours)', async () => {
      await scheduleWaterReminders(1.5, true);

      // 7, 8.5, 10, 11.5, 13, 14.5, 16, 17.5, 19, 20.5 == 10 instances
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(10);

      // Check 8:30 logic
      expect(Notifications.scheduleNotificationAsync).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          identifier: 'water-reminder-1',
          trigger: expect.objectContaining({
            hour: 8,
            minute: 30, // 0.5 * 60
          }),
        })
      );
    });

    it('does not schedule if enabled is false', async () => {
      await scheduleWaterReminders(2, false);
      expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });
  });

  describe('Exercise Reminders', () => {
    it('cancels existing exercise reminders', async () => {
      (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([
        { identifier: 'exercise-morning' },
        { identifier: 'water-reminder-0' }, // shouldn't cancel
      ]);

      await cancelExerciseReminders();

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('exercise-morning');
    });

    it('schedules both if both enabled', async () => {
      await scheduleExerciseReminders(true, true);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          identifier: 'exercise-morning',
          trigger: expect.objectContaining({ hour: 7 }),
        })
      );

      expect(Notifications.scheduleNotificationAsync).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          identifier: 'exercise-afternoon',
          trigger: expect.objectContaining({ hour: 17 }),
        })
      );
    });

    it('schedules only morning', async () => {
      await scheduleExerciseReminders(true, false);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({ identifier: 'exercise-morning' })
      );
    });

    it('schedules only afternoon', async () => {
      await scheduleExerciseReminders(false, true);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({ identifier: 'exercise-afternoon' })
      );
    });
  });

  describe('initNotifications', () => {
    it('reads settings and schedules correctly', async () => {
      (getUserSettings as jest.Mock).mockResolvedValue({
        water_notif_enabled: 1,
        water_notif_interval_hours: 3,
        exercise_morning_notif_enabled: 1,
        exercise_afternoon_notif_enabled: 0,
      });

      await initNotifications();

      // Water: Yes, 3 hours (7, 10, 13, 16, 19) => 5 times
      // Exercise: Only morning => 1 time
      // Total 6 calls to schedule
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(6);
    });

    it('cancels everything if user disabled everything', async () => {
        (getUserSettings as jest.Mock).mockResolvedValue({
          water_notif_enabled: 0,
          exercise_morning_notif_enabled: 0,
          exercise_afternoon_notif_enabled: 0,
        });

        // First inject some mock notifications so cancel can process them
        (Notifications.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue([
            { identifier: 'water-reminder-0' },
            { identifier: 'exercise-afternoon' }
        ]);

        await initNotifications();

        // 0 calls to schedule
        expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(0);

        // 2 calls to cancel
        expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
      });
  });
});
