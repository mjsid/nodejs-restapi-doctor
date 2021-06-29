var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

//Doctor routes
var indexRoute = require("./routes/doctor/index");
var usersRoute = require("./routes/doctor/users");
var registerRoute = require("./routes/doctor/register");
var depRoute = require("./routes/doctor/departments");
var loginRoute = require("./routes/doctor/login");
var verifyRoute = require("./routes/doctor/verify");
var appointmentRoute = require("./routes/doctor/appointment");
var scheduleRoute = require("./routes/doctor/schedule");
var patientRoute = require("./routes/doctor/patient");
var reviewRoute = require("./routes/doctor/review");
var doctorRoute = require("./routes/doctor/doctor");
var chatRoute = require("./routes/doctor/chat");

//User or patients route
var userLoginRoute = require("./routes/user/login");
var userRegisterRoute = require("./routes/user/register");
var userProfileRoute = require("./routes/user/profile");
var userConsultationRoute = require("./routes/user/consultation");
var userChatRoute = require("./routes/user/chat");
var userRatingRoute = require("./routes/user/rating");
var userAppointmentRoute = require("./routes/user/appointment");
var userPrescriptionRoute = require("./routes/user/prescription");
var categoryRoute = require("./routes/user/category");
var medicineRoute = require("./routes/user/medicine");
var brandRoute = require("./routes/user/brand");
var bannerRoute = require("./routes/user/banner");
var userDoctorRoute = require("./routes/user/doctor");
var searchRoute = require("./routes/user/search");
var wishlistRoute = require("./routes/user/wishlist");
var cartRoute = require("./routes/user/cart");
var userLabRoute = require("./routes/user/lab");
var orderRoute = require("./routes/user/order");
var userPayment = require("./routes/user/payment");
var userAmbulanceRoute = require("./routes/user/ambulance");
var couponRoute = require("./routes/user/coupon");
var notificationRoute = require("./routes/user/notification");
var userAddressRoute = require("./routes/user/address");

//Ambulance API
var ambulanceLogin = require("./routes/ambulance/login");
var ambulanceRegister = require("./routes/ambulance/register");
var ambulanceMisc = require("./routes/ambulance/miscellaneous");
var ambulanceBooking = require("./routes/ambulance/booking");

//Twilio
var twilioApi = require("./routes/twilio_api");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "100mb" }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
// app.use(express.bodyParser({ limit: "50mb" }));

app.use("/", indexRoute);
app.use("/api/register", registerRoute);
app.use("/api/users", usersRoute);
app.use("/api/departments", depRoute);
app.use("/api/login", loginRoute);
app.use("/verify", verifyRoute);
app.use("/api/appointment", appointmentRoute);
app.use("/api/schedule", scheduleRoute);
app.use("/api/patient", patientRoute);
app.use("/api/review", reviewRoute);
app.use("/api/doctor", doctorRoute);
app.use("/api/chat", chatRoute);

//user or patient api calls
app.use("/api/user/login", userLoginRoute);
app.use("/api/user/register", userRegisterRoute);
app.use("/api/user/profile", userProfileRoute);
app.use("/api/user/consultation", userConsultationRoute);
app.use("/api/user/rating", userRatingRoute);
app.use("/api/user/chat", userChatRoute);
app.use("/api/user/appointment", userAppointmentRoute);
app.use("/api/categories", categoryRoute);
app.use("/api/medicine", medicineRoute);
app.use("/api/brand", brandRoute);
app.use("/api/banner", bannerRoute);
app.use("/api/user/doctor", userDoctorRoute);
app.use("/api/user/search", searchRoute);
app.use("/api/user/wishlist", wishlistRoute);
app.use("/api/user/cart", cartRoute);
app.use("/api/user/prescription", userPrescriptionRoute);
app.use("/api/user/lab", userLabRoute);
app.use("/api/user/order", orderRoute);
app.use("/api/user/ambulance", userAmbulanceRoute);
app.use("/api/user/coupon", couponRoute);
app.use("/api/user/payment", userPayment);
app.use("/api/user/notification", notificationRoute);
app.use("/api/user/address", userAddressRoute);

//ambulance api calls

app.use("/api/ambulance/login", ambulanceLogin);
app.use("/api/ambulance/register", ambulanceRegister);
app.use("/api/ambulance/booking", ambulanceBooking);
app.use("/api/ambulance", ambulanceMisc);

app.use("/api/twilio", twilioApi);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
