/**
 * Request validation schemas.
 *
 * These are the server's input gate - every one of them decides whether a
 * malformed request reaches a controller. The tests assert both arms: what is
 * accepted, and what is rejected with which message.
 */
const validator = require('../index');

const ok = (schema, value) => {
  const { error } = schema.validate(value);
  return { valid: !error, message: error?.details?.[0]?.message };
};

describe('emailValidator', () => {
  const s = () => require('joi').object({ email: validator.emailValidator() });

  it.each(['a@b.com', 'first.last@sub.domain.co.uk', 'x+tag@b.io'])
    ('accepts %s', (email) => expect(ok(s(), { email }).valid).toBe(true));

  it('trims surrounding whitespace', () => {
    const { value } = s().validate({ email: '  a@b.com  ' });
    expect(value.email).toBe('a@b.com');
  });

  it.each(['not-an-email', 'a@', '@b.com', 'a b@c.com'])
    ('rejects %s', (email) => expect(ok(s(), { email }).valid).toBe(false));

  it('reports a specific message for an empty email', () => {
    expect(ok(s(), { email: '' }).message).toBe('Email is required');
  });

  it('reports a specific message for a malformed email', () => {
    expect(ok(s(), { email: 'nope' }).message).toBe('Invalid email format');
  });
});

describe('passwordValidator', () => {
  const s = () => require('joi').object({ password: validator.passwordValidator('Password is required') });

  it('accepts a password of at least 8 characters', () => {
    expect(ok(s(), { password: 'hunter22' }).valid).toBe(true);
  });

  it('rejects a shorter password with a length message', () => {
    expect(ok(s(), { password: 'short' }).message)
      .toBe('Password must be at least 8 characters long');
  });

  it('uses the caller-supplied message when empty', () => {
    expect(ok(s(), { password: '' }).message).toBe('Password is required');
  });
});

describe('getLoginSchema', () => {
  const s = validator.getLoginSchema();
  const creds = { email: 'a@b.com', password: 'hunter22' };

  it('accepts email and password alone', () => {
    expect(ok(s, creds).valid).toBe(true);
  });

  it('accepts the optional mobile fields', () => {
    expect(ok(s, { ...creds, slug: 'acme', deviceId: 'd1', fcmToken: 'f1' }).valid).toBe(true);
  });

  it('rejects a missing password', () => {
    expect(ok(s, { email: 'a@b.com' }).valid).toBe(false);
  });

  it('rejects unknown fields, so stray input cannot reach the controller', () => {
    expect(ok(s, { ...creds, isAdmin: true }).valid).toBe(false);
  });
});

describe('getResetPasswordSchema', () => {
  const s = validator.getResetPasswordSchema();

  it('accepts a token with a 6+ character password', () => {
    expect(ok(s, { token: 't', newPassword: 'abcdef' }).valid).toBe(true);
  });

  it('rejects a password under 6 characters', () => {
    expect(ok(s, { token: 't', newPassword: 'abc' }).message)
      .toBe('Password must be at least 6 characters');
  });

  it('rejects a missing token with its own message', () => {
    expect(ok(s, { newPassword: 'abcdef' }).message).toBe('Token is required');
  });

  it('rejects a non-string token', () => {
    expect(ok(s, { token: 123, newPassword: 'abcdef' }).message).toBe('Token must be a string');
  });
});

describe('getChangePasswordSchema', () => {
  const s = validator.getChangePasswordSchema();

  it('accepts both passwords', () => {
    expect(ok(s, { oldPassword: 'oldpass1', newPassword: 'newpass1' }).valid).toBe(true);
  });

  it('rejects a blank old password with the custom message', () => {
    expect(ok(s, { oldPassword: '', newPassword: 'newpass1' }).message)
      .toBe('Old password is required');
  });

  /**
   * Note the inconsistency: passwordValidator only overrides "string.empty", so
   * a field that is ABSENT falls through to Joi's default wording rather than
   * the caller's message. Asserted as-is so a future message cleanup is visible.
   */
  it('rejects an absent old password with Joi\'s default wording', () => {
    expect(ok(s, { newPassword: 'newpass1' }).message).toBe('"oldPassword" is required');
  });
});

describe('getPasswordSchema', () => {
  it('requires a single new password', () => {
    const s = validator.getPasswordSchema();
    expect(ok(s, { newPassword: 'hunter22' }).valid).toBe(true);
    expect(ok(s, { newPassword: '' }).message).toBe('Password is required');
    expect(ok(s, {}).message).toBe('"newPassword" is required');   // see note above
  });
});

describe('getAddUserSchema', () => {
  const s = validator.getAddUserSchema();
  const user = {
    email: 'a@b.com', password: 'hunter22', firstName: 'Kunal',
    lastName: 'Shah', companyId: 'c1', pmsRoleId: 'r1',
  };

  it('accepts a fully specified user', () => {
    expect(ok(s, user).valid).toBe(true);
  });

  it.each(['email', 'password', 'firstName', 'lastName', 'companyId', 'pmsRoleId'])
    ('rejects a user missing %s', (field) => {
      const { [field]: _drop, ...rest } = user;
      expect(ok(s, rest).valid).toBe(false);
    });
});

describe('fileUploadSizeSchema', () => {
  const s = validator.fileUploadSizeSchema();

  it.each([1, 40, 80])('accepts %i MB', (n) => expect(ok(s, { fileUploadSize: n }).valid).toBe(true));

  it('rejects 0 MB with a lower-bound message', () => {
    expect(ok(s, { fileUploadSize: 0 }).message).toBe('File upload size must be at least 1 MB.');
  });

  it('rejects above 80 MB with an upper-bound message', () => {
    expect(ok(s, { fileUploadSize: 81 }).message).toBe('File upload size must be at most 80 MB.');
  });

  it('rejects a non-numeric size', () => {
    expect(ok(s, { fileUploadSize: 'big' }).message).toBe('File upload size must be a number.');
  });

  it('rejects a missing size', () => {
    expect(ok(s, {}).message).toBe('File upload size is required.');
  });
});

describe('CSV import schemas', () => {
  it('accepts a minimal user row and treats phone/role as optional', () => {
    const s = validator.getAddUserSchemaCSV();
    expect(ok(s, {
      Email: 'a@b.com', Password: 'hunter22',
      'First Name': 'Kunal', 'Last Name': 'Shah',
    }).valid).toBe(true);
    expect(ok(s, {
      Email: 'a@b.com', Password: 'hunter22',
      'First Name': 'Kunal', 'Last Name': 'Shah',
      'Phone Number': '', 'Role': null,
    }).valid).toBe(true);
  });

  it('rejects a user row with a bad email', () => {
    const s = validator.getAddUserSchemaCSV();
    expect(ok(s, {
      Email: 'nope', Password: 'hunter22',
      'First Name': 'K', 'Last Name': 'S',
    }).valid).toBe(false);
  });

  it('accepts a client row and allows a blank company name', () => {
    const s = validator.getAddClientSchemaCSV();
    expect(ok(s, {
      'First Name': 'Kunal', 'Last Name': 'Shah',
      Email: 'a@b.com', Password: 'hunter22', 'Company Name': '',
    }).valid).toBe(true);
  });

  it('rejects a client row with no last name', () => {
    const s = validator.getAddClientSchemaCSV();
    expect(ok(s, { 'First Name': 'Kunal', Email: 'a@b.com', Password: 'hunter22' }).valid).toBe(false);
  });
});

describe('getEmailValidationSchema', () => {
  it('accepts a valid address and rejects an invalid one', () => {
    const s = validator.getEmailValidationSchema();
    expect(ok(s, { email: 'a@b.com' }).valid).toBe(true);
    expect(ok(s, { email: 'nope' }).valid).toBe(false);
  });
});

describe('getRegistrationSchema', () => {
  const s = validator.getRegistrationSchema();
  const payload = {
    adminDetails: {
      first_name: 'Kunal', last_name: 'Shah', email: 'a@b.com',
      phone_number: '9999999999', country_code: '+91', password: 'hunter22',
    },
    companyDetails: { companyName: 'Acme', companyDomain: 'acme' },
  };

  it('accepts a complete registration', () => {
    expect(ok(s, payload).valid).toBe(true);
  });

  it('rejects a password under 8 characters', () => {
    expect(ok(s, { ...payload, adminDetails: { ...payload.adminDetails, password: 'short' } }).message)
      .toBe('Password must be at least 8 characters long');
  });

  it('rejects a missing phone number with its own message', () => {
    expect(ok(s, { ...payload, adminDetails: { ...payload.adminDetails, phone_number: '' } }).message)
      .toBe('Phone Number is required');
  });

  it('requires companyDetails', () => {
    expect(ok(s, { adminDetails: payload.adminDetails }).valid).toBe(false);
  });

  it('requires adminDetails', () => {
    expect(ok(s, { companyDetails: payload.companyDetails }).valid).toBe(false);
  });
});

describe('remaining schemas are well-formed Joi objects', () => {
  it.each([
    'getEditUserSchema', 'getEditEmpSchema', 'getAddCompanySchema',
    'getAddAdminSchema', 'getEditAdminSchema', 'getSMTPConfigSchema',
  ])('%s builds a schema that validates input', (name) => {
    const schema = validator[name]();
    expect(typeof schema.validate).toBe('function');
    // An empty object must not silently pass a schema with required fields.
    expect(schema.validate({})).toHaveProperty('error');
  });
});
