/**
 * Defines the router for reservation resources.
 *
 * @type {Router}
 */

const router = require("express").Router();
const controller = require("./reservations.controller");

router.route("/").get(controller.list).post(controller.create).all();
router
  .route("/:reservation_id")
  .get(controller.read)
  .put(controller.update)
  .all();
router.route("/:reservation_id/status").put(controller.status).all();

module.exports = router;
