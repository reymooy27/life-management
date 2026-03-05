import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getUserSettings } from '../../db/database';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request minimal permissions.
 */
export async function requestPermissions(): Promise<boolean> {
  let finalStatus;
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#BB86FC',
    });
  }

  return finalStatus === 'granted';
}

/**
 * Cancels all scheduled water reminders.
 */
export async function cancelWaterReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.identifier.startsWith('water-reminder-')) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
}

/**
 * Schedules water reminders for today and repeating every N hours between 7am and 9pm.
 * N = intervalHours.
 */
export async function scheduleWaterReminders(intervalHours: number, enabled: boolean): Promise<void> {
  // First clean up any existing water reminders
  await cancelWaterReminders();

  if (!enabled) return;

  const hasPermission = await requestPermissions();
  if (!hasPermission) return;

  const startHour = 7;
  const endHour = 21;

  // Schedule daily triggers at each calculated valid interval
  let currentHour = startHour;
  let slotIndex = 0;

  while (currentHour <= endHour) {
    const hourInt = Math.floor(currentHour);
    const minuteInt = Math.round((currentHour - hourInt) * 60);

    // Expo lets us schedule daily repeating notifications easily
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Time to hydrate! 💧",
        body: "Drink some water and log it in LifeFlow.",
        autoDismiss: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hourInt,
        minute: minuteInt,
      },
      identifier: `water-reminder-${slotIndex}`,
    });

    currentHour += intervalHours;
    slotIndex++;
  }
}

/**
 * Cancels all exercise reminders.
 */
export async function cancelExerciseReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notif of scheduled) {
    if (notif.identifier.startsWith('exercise-')) {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }
}

/**
 * Schedules exercise reminders for morning and afternoon
 */
export async function scheduleExerciseReminders(morningEnabled: boolean, afternoonEnabled: boolean): Promise<void> {
  await cancelExerciseReminders();

  const hasPermission = await requestPermissions();
  if (!hasPermission) return;

  if (morningEnabled) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Morning Exercise 🏃",
        body: "A great day starts with moving! Have you logged your workout?",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 7,
        minute: 0,
      },
      identifier: 'exercise-morning',
    });
  }

  if (afternoonEnabled) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Afternoon Check-in 🏋️",
        body: "Wrap up the day with some activity. Don't forget to pack in your exercises!",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 17,
        minute: 0,
      },
      identifier: 'exercise-afternoon',
    });
  }
}

/**
 * Sync schedule state with database settings on app start
 */
export async function initNotifications(): Promise<void> {
  try {
    const settings = await getUserSettings();
    if (!settings) return;

    // We proactively reschedule all valid notifications. This cleans up duplicates
    // and correctly applies logic in case of missing permissions or missed triggers.

    // Water
    if (settings.water_notif_enabled) {
      await scheduleWaterReminders(settings.water_notif_interval_hours || 2, true);
    } else {
      await cancelWaterReminders();
    }

    // Exercise
    if (settings.exercise_morning_notif_enabled || settings.exercise_afternoon_notif_enabled) {
      await scheduleExerciseReminders(
         !!settings.exercise_morning_notif_enabled,
         !!settings.exercise_afternoon_notif_enabled
      );
    } else {
      await cancelExerciseReminders();
    }

  } catch (error) {
    console.warn("Failed to initialize notifications on load:", error);
  }
}
