const { ErrorHandler } = require('../error');

it('is a real Error carrying the status code and message', () => {
  const e = new ErrorHandler(404, 'Not found');
  expect(e).toBeInstanceOf(Error);
  expect(e.statusCode).toBe(404);
  expect(e.message).toBe('Not found');
  expect(e.status).toBe(0);
});

it('captures a stack trace', () => {
  expect(new ErrorHandler(500, 'boom').stack).toContain('error.test.js');
});
