const service = require("./reservations.service");
const asyncErrorBoundary = require("../errors/asyncErrorBoundary");
function hasValidFields(req, res, next) {
  const { data = {} } = req.body;
  const validFields = new Set([
    "first_name",
    "last_name",
    "mobile_number",
    "reservation_date",
    "reservation_time",
    "people",
    "status",
    "created_at",
    "updated_at",
    "reservation_id",
  ]);
  const invalidFields = Object.keys(data).filter(
    (field) => !validFields.has(field)
  );
  if (invalidFields.length)
    return next({
      status: 400,
      message: `Invalid field(s): ${invalidFields.join(", ")}`,
    });
  next();
}
function hasReservationId(req, res, next) {
  const reservation =
    req.params.reservation_id || req.body?.data?.reservation_id;
  if (reservation) {
    res.locals.reservation_id = reservation;
    next();
  } else {
    next({
      status: 400,
      message: `missing reservation_id`,
    });
  }
}
async function reservationExists(req, res, next) {
  const reservation_id = res.locals.reservation_id;
  const reservation = await service.read(reservation_id);
  if (reservation) {
    res.locals.reservation = reservation;
    next();
  } else {
    next({ status: 404, message: `Reservation not found: ${reservation_id}` });
  }
}
function bodyDataHas(propertyName) {
  return function (req, res, next) {
    const { data = {} } = req.body;
    if (data[propertyName]) {
      return next();
    }
    next({ status: 400, message: `Must include a ${propertyName}` });
  };
}
function hasValidDate(req, res, next) {
  const { reservation_date, reservation_time } = req.body.data;
  const invalidDate = 2;
  const submitDate = new Date(reservation_date + " " + reservation_time);
  const dayAsNum = submitDate.getDay();
  const today = new Date();
  const dateFormat = /\d\d\d\d-\d\d-\d\d/;
  if (!reservation_date) {
    next({
      status: 400,
      message: `reservation_date cannot be empty. Please select a date.`,
    });
  }
  if (!reservation_date.match(dateFormat)) {
    return next({
      status: 400,
      message: `the reservation_date must be a valid date in the format 'YYYY-MM-DD'`,
    });
  }
  if (submitDate < today) {
    next({
      status: 400,
      message: `The date and time cannot be in the past. Please select a future date. Today is ${today}.`,
    });
  }
  if (dayAsNum === invalidDate) {
    next({
      status: 400,
      message: `The restaurant is closed on Tuesdays. Please select a different day.`,
    });
  }
  next();
}
function hasValidTime(req, res, next) {
  const { reservation_time } = req.body.data;
  const timeFormat = /\d\d:\d\d/;
  if (!reservation_time) {
    next({
      status: 400,
      message: `reservation_time cannot be empty. Please select a time.`,
    });
  }
  if (!reservation_time.match(timeFormat)) {
    return next({
      status: 400,
      message: `the reservation_time must be a valid time in the format '12:30`,
    });
  }
  if (reservation_time < "10:29:59") {
    next({
      status: 400,
      message: "The restaurant does not open until 10:30 a.m.",
    });
  } else {
    if (reservation_time >= "21:30:00") {
      next({
        status: 400,
        message: `The restaurant closes at 22:30 (10:30 pm). Please schedule your reservation at least one hour before close.`,
      });
    }
  }
  next();
}
function checkStatus(req, res, next) {
  const { data = {} } = req.body;
  if (data["status"] === "seated" || data["status"] === "finished") {
    return next({ status: 400, message: `status is ${data["status"]}` });
  }
  next();
}
function isValidNumber(req, res, next) {
  const { data = {} } = req.body;
  if (data["people"] === 0 || !Number.isInteger(data["people"])) {
    return next({ status: 400, message: `Invalid number of people` });
  }
  next();
}
async function list(req, res) {
  const { date, mobile_number } = req.query;
  if (date) {
    res.json({ data: await service.listByDate(date) });
  } else if (mobile_number) {
    res.json({ data: await service.search(mobile_number) });
  } else {
    res.json({ data: await service.list() });
  }
}
async function create(req, res) {
  const data = await service.create(req.body.data);
  res.status(201).json({
    data: data,
  });
}
async function read(req, res) {
  const data = res.locals.reservation;
  res.status(200).json({
    data,
  });
}
async function status(req, res) {
  res.locals.reservation.status = req.body.data.status;
  const data = await service.status(res.locals.reservation);
  res.json({ data });
}
async function unfinishedStatus(req, res, next) {
  if ("booked" !== res.locals.reservation.status) {
    next({
      status: 400,
      message: `Reservation status: '${res.locals.reservation.status}'.`,
    });
  } else {
    next();
  }
}
async function update(req, res) {
  const { reservation_id } = res.locals.reservation;
  req.body.data.reservation_id = reservation_id;
  const data = await service.status(req.body.data);
  res.json({ data });
}
const has_first_name = bodyDataHas("first_name");
const has_last_name = bodyDataHas("last_name");
const has_mobile_number = bodyDataHas("mobile_number");
const has_reservation_date = bodyDataHas("reservation_date");
const has_reservation_time = bodyDataHas("reservation_time");
const has_people = bodyDataHas("people");
module.exports = {
  create: [
    hasValidFields,
    has_first_name,
    has_last_name,
    has_mobile_number,
    has_reservation_date,
    has_reservation_time,
    has_people,
    hasValidDate,
    hasValidTime,
    isValidNumber,
    checkStatus,
    asyncErrorBoundary(create),
  ],
  read: [hasReservationId, reservationExists, asyncErrorBoundary(read)],
  list: [asyncErrorBoundary(list)],
  reservationExists: [hasReservationId, reservationExists],
  status: [
    hasReservationId,
    reservationExists,
    unfinishedStatus,
    asyncErrorBoundary(status),
  ],
  update: [
    hasValidFields,
    has_first_name,
    has_last_name,
    has_mobile_number,
    has_reservation_date,
    has_reservation_time,
    has_people,
    hasValidDate,
    hasValidTime,
    isValidNumber,
    checkStatus,
    hasReservationId,
    reservationExists,
    asyncErrorBoundary(update),
  ],
};
