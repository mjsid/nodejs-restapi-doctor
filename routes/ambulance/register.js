var express = require("express");
var router = express.Router();
var db = require("../../database");
var bcrypt = require("bcrypt");

// var sendmail = require("../../email");
// var transporter = sendmail["transporter"];
// var mailOptions = sendmail["mailOptions"];
// var prephtml = sendmail["prephtml"];

//POST request
// router.get("/", function (req, res, next) {
//   res.render("registration");
// });

// Function to generate unique token
function gentoken(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// Current date time in YYYY-MM-DD hh:mm:ss format e.g. 2020-10-15 18:10:27
function getCurrentTime() {
  var current_date_time = new Date()
    .toISOString()
    .replace("T", " ")
    .substr(0, 19);
  return current_date_time;
}

//Registration request
router.post("/", async function (req, res, next) {
  var department_id = req.body["department_id"] || 4;
  var first_name = req.body["first_name"];
  var last_name = req.body["last_name"];
  var email = req.body["email"];
  var password = await bcrypt.hash(req.body["password"], 10);
  var designation = req.body["designation"] || "Ambulance";
  var phone = req.body["phone"];
  var gender = req.body["gender"];
  var owner_type = "App\\Models\\Ambulance";
  var status = 0;
  var language = "en";
  var device_id = req.body["device_id"];
  var lat = req.body["lat"] || "";
  var lng = req.body["lng"] || "";
  var address1 = req.body["address1"] || "";
  var address2 = req.body["address2"] || "";
  var zip = req.body["zip"] || "";
  var city = req.body["city"] || "";
  var state = req.body["state"] || "";
  var created_at = getCurrentTime();
  var updated_at = getCurrentTime();
  //   var token = gentoken(20);

  if (
    !department_id ||
    !first_name ||
    !last_name ||
    !email ||
    !password ||
    !designation ||
    !phone ||
    !gender ||
    !owner_type ||
    !language ||
    !device_id ||
    !created_at ||
    !updated_at
  ) {
    console.log("Please provide the missing fields");
    res.status(400);
    res.json({ code: 100, message: "Please provide the missing fields" });
  } else {
    // Register new User
    db.query(
      "INSERT INTO `users` (`department_id`, `first_name`, `last_name`, `email`, `password`, `designation`, `phone`, `gender`, `owner_id`, `owner_type`, `status`, `language`, `created_at`, `updated_at`, `device_id`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, ?,?) ",
      [
        department_id,
        first_name,
        last_name,
        email,
        password,
        designation,
        phone,
        gender,
        1,
        owner_type,
        status,
        language,
        created_at,
        updated_at,
        device_id,
      ],
      async function (err, results, fields) {
        if (err) {
          console.log("ERROR fetching query : ");
          if (err["code"] == "ER_DUP_ENTRY") {
            console.log(err);
            var message = "";

            if (err["sqlMessage"].match(/@/g)) {
              const qResult = await db.query(
                `Select designation FROM users WHERE email=?`,
                [email]
              );
              console.log(qResult);

              if (qResult[0].designation == designation) {
                message =
                  "This Email is already in use, please sign in or use a different email";
              } else {
                message =
                  "This Email is already in use with different role. Please try with different email";
              }

              res.status(200);
              res.json({ code: 100, message: message });
            } else if (err["sqlMessage"].match(/'phone'/g)) {
              const qResult = await db.query(
                `Select designation FROM users WHERE phone=?`,
                [phone]
              );
              console.log(qResult);

              if (qResult[0].designation == designation) {
                message =
                  "This Phone Number is already in use, please sign in or use a different phone number";
              } else {
                message =
                  "This Phone Number is already in use with different role. Please try with different phone number";
              }
              res.status(200);
              res.json({
                code: 100,
                message: message,
              });
            } else {
              res.status(200);
              res.json({
                code: 100,
                message: `Unknown Error ${err["sqlMessage"]}`,
              });
            }
          } else {
            res.status(500);
            res.json({ code: 100, message: "Unknown Error Occurred" });
            console.log(err);
          }
        } else if (results.insertId > 0) {
          console.log(results);
          var userId = results.insertId;
          console.log(userId);

          db.query(
            `INSERT INTO ambulance_users (user_id, ambulance_type, created_at, updated_at) VALUES (?, ?, ?, ?) `,
            [userId, 1, getCurrentTime(), getCurrentTime()],
            async function (err, results, fields) {
              if (err) {
                console.log("ERROR inserting into ambulance_users : ", err);
                res.status(500).json({
                  code: 100,
                  message: "Ambulance registered with errors : ambulance_users",
                });
              } else if (results.insertId > 0) {
                const ambulanceId = results.insertId;
                try {
                  response = await db.query(
                    "INSERT INTO `addresses` (`owner_id`, `owner_type`, `address1`, `address2`, `city`, `zip`, `lat`, `lng`, `state`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    [
                      ambulanceId,
                      "App\\Models\\User",
                      address1,
                      address2,
                      city,
                      zip,
                      lat,
                      lng,
                      state,
                      getCurrentTime(),
                      getCurrentTime(),
                    ]
                  );
                } catch (err) {
                  console.log("Error while updating address");
                }
                console.log(results);
                db.query(
                  `INSERT INTO model_has_roles (role_id, model_type, model_id) VALUES (?, ?, ?) `,
                  [4, "App\\Models\\User", userId],
                  function (err, results, fields) {
                    if (err) {
                      console.log(
                        "ERROR inserting into model_has_roles : ",
                        err
                      );
                      res.status(500).json({
                        code: 100,
                        message:
                          "Ambulance registered with errors : model_has_roles",
                      });
                    } else {
                      console.log(results);
                      res.status(200).json({
                        code: 200,
                        message: "New User registered Successfully",
                        user_id: userId,
                      });
                    }
                  }
                );
              } else {
                console.log(results);
                res.status(200).json({
                  code: 100,
                  message: "Ambulance registered with error : ambulance_users",
                  user_id: userId,
                });
              }
            }
          );

          //   mailOptions["to"] = email;
          //   mailOptions["subject"] = " Verify your mail for application ";
          //   mailOptions["html"] = prephtml(token, userId);

          //   transporter.sendMail(mailOptions, function (error, info) {
          //     if (error) {
          //       console.log("Error is");
          //       console.log(error);
          //     } else {
          //       console.log("Info is ");
          //       console.log(info);
          //     }
          //   });
        } else {
          console.log(results);
          res.status(200).json({
            code: 100,
            message: "Registration unsuccessful",
          });
        }
      }
    );
  }
});

module.exports = router;
