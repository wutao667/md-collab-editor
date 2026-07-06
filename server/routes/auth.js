const config = require('../config');

module.exports = async function (fastify) {
  // POST /api/auth/login - Verify password and return access token
  fastify.post('/auth/login', async (request, reply) => {
    const { password } = request.body || {};

    if (!password) {
      request.log.warn({ body: request.body }, 'Login missing password field');
      return reply.code(400).send({ error: 'Password is required' });
    }

    if (typeof password !== 'string') {
      request.log.warn({ passwordType: typeof password }, 'Login password is not a string');
      return reply.code(400).send({ error: 'Password must be a string' });
    }

    // Prevent potential trimming/encoding issues by doing a strict comparison
    if (password !== config.accessPassword) {
      request.log.warn(
        {
          passwordLength: password.length,
          expectedLength: config.accessPassword.length,
          // Never log the actual password values, just compare lengths for debugging
        },
        'Login failed: password mismatch'
      );
      return reply.code(401).send({ error: 'Invalid password' });
    }

    request.log.info('Login successful');
    return {
      success: true,
      token: config.accessToken,
      message: 'Login successful',
    };
  });
};
