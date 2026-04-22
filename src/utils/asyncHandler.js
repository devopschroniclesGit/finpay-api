/**
 * Wraps async route handlers to eliminate try/catch boilerplate.
 *
 * Without this:
 *   router.get('/users', async (req, res, next) => {
 *     try {
 *       const users = await getUsers();
 *       res.json(users);
 *     } catch (err) {
 *       next(err);  // every single handler needs this
 *     }
 *   });
 *
 * With this:
 *   router.get('/users', asyncHandler(async (req, res) => {
 *     const users = await getUsers();
 *     res.json(users);   // errors automatically forwarded to errorHandler middleware
 *   }));
 */

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
