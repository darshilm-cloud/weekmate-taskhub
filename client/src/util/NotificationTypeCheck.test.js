/**
 * Maps a notification type to its display title and destination tab.
 * The default arm matters: an unrecognised type must still render something.
 */
const { checkNotificationType } = require('./NotificationTypeCheck');
const { notificationType } = require('../settings/notificationTypes');

it.each([
  ['PROJECT_ASSIGNED', 'Assign project', 'Tasks'],
  ['LIST_ASSIGNED', 'Assign new task list', 'Tasks'],
  ['TASK_ASSIGNED', 'Assign task', 'Tasks'],
  ['TASK_COMMENT_ASSIGNED', 'Mention in task comment', 'Tasks'],
  ['TASK_COMMENT_ADDED', 'Task Comment added', 'Tasks'],
  ['DISCUSSION_SUBSCRIBERS', 'Subscribe in discussion', 'Discussion'],
  ['DISCUSSION_TAGGED_USERS', 'Mention in discussion', 'Discussion'],
  ['BUG_ASSIGNED', 'Assign bug', 'Bugs'],
  ['BUG_COMMENTS', 'Mention in bug', 'Bugs'],
  ['TASK_LOGGED_HOURS', 'Hours logged in task', 'Time'],
  ['NOTE_SUBSCRIBERS', 'Subscribe in note', 'Notes'],
  ['NOTE_COMMENTS_TAGGED_USERS', 'Mention in note', 'Notes'],
  ['FILE_SUBSCRIBERS', 'Subscribed in files', 'Files'],
])('routes %s to the %s tab', (key, title, tab) => {
  const out = checkNotificationType(notificationType[key]);
  expect(out.title).toBe(title);
  expect(out.tab).toBe(tab);
  expect(out.url).toContain('project-list');
});

it.each([undefined, null, 'not_a_type', 999])
  ('falls back to a generic notification for %s', (t) => {
    expect(checkNotificationType(t)).toMatchObject({
      title: 'You have a notification',
      tab: 'Overview',
    });
  });
