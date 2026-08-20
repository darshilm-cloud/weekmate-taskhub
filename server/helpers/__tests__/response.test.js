/**
 * Response envelope. Every API reply goes through this, so the shape
 * (statusCode / status / message / data) is effectively the API contract.
 */
const response = require('../response');
const { statusCode } = require('../constant');
const resMsg = require('../messages');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};
const sent = (res) => res.send.mock.calls[0][0];

describe('successResponse', () => {
  it('sends the payload with status 1 and the given code', () => {
    const res = mockRes();
    response.successResponse(res, 201, 'Created', { _id: 'a' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(sent(res)).toMatchObject({ statusCode: 201, status: 1, message: 'Created', data: { _id: 'a' } });
  });

  it('defaults to 200 when no code is given', () => {
    const res = mockRes();
    response.successResponse(res, undefined, 'OK');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('substitutes empty arrays for missing data and metadata', () => {
    const res = mockRes();
    response.successResponse(res, 200, 'OK');
    expect(sent(res)).toMatchObject({ data: [], metadata: [], permissions: [], pms_role_id: '' });
  });

  it('passes permissions and role through untouched', () => {
    const res = mockRes();
    response.successResponse(res, 200, 'OK', [], [], [1, 2], 'role-1');
    expect(sent(res)).toMatchObject({ permissions: [1, 2], pms_role_id: 'role-1' });
  });

  it('preserves a falsy-but-meaningful payload as an empty array', () => {
    const res = mockRes();
    response.successResponse(res, 200, 'OK', 0);
    expect(sent(res).data).toEqual([]);
  });
});

describe('errorResponse', () => {
  it('sends status 0 with the supplied code and message', () => {
    const res = mockRes();
    response.errorResponse(res, 404, 'Not found');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(sent(res)).toMatchObject({ statusCode: 404, status: 0, message: 'Not found', data: [] });
  });

  it('falls back to the server-error code and message', () => {
    const res = mockRes();
    response.errorResponse(res);
    expect(res.status).toHaveBeenCalledWith(statusCode.SERVER_ERROR);
    expect(sent(res).message).toBe(resMsg.SERVER_ERROR);
  });
});

describe('catchBlockErrorResponse', () => {
  it('defaults to the server-error envelope', () => {
    const res = mockRes();
    response.catchBlockErrorResponse(res);
    expect(res.status).toHaveBeenCalledWith(statusCode.SERVER_ERROR);
    expect(sent(res)).toMatchObject({ status: 0, message: resMsg.SERVER_ERROR });
  });

  it('honours an explicit message and status', () => {
    const res = mockRes();
    response.catchBlockErrorResponse(res, 'Boom', 502, ['ctx']);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(sent(res)).toMatchObject({ message: 'Boom', data: ['ctx'] });
  });
});
