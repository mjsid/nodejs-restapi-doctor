var express = require("express");
var router = express.Router();
var db = require("../../database");
var bcrypt = require("bcrypt");
const { use } = require("../../app");
var { getCurrentTime, generateOTP, sendOTP } = require("../utils");

router.get("/getotp", async function (req, res, next) {
  var mobile = req.query.mobile;
  var otp = Number(generateOTP(4));
  var currentTime = getCurrentTime();

  console.log(otp);
  try {
    const results = await db.query("SELECT * from `users` WHERE phone=?", [
      mobile,
    ]);
    if (results.length > 0) {
      db.query(
        "UPDATE `users` SET `otp`=?, `updated_at`=? WHERE phone=? && designation=? ",
        [otp, currentTime, mobile, "Patient"],
        async function (error, results, fields) {
          if (error) {
            console.log(error);
            res.status(500).json({
              code: 100,
              message: "Unknown Error Ocurred",
            });
          } else {
            console.log(results);
            if (results.affectedRows == 0) {
              res.status(200).json({
                code: 100,
                message:
                  "This Phone number is registered with a different role or deactivated, please contact customer support",
              });
            } else {
              const success = await sendOTP(otp, mobile);
              console.log(success);
              if (success) {
                res.status(200).json({
                  code: 200,
                  message: "OTP sent successfully",
                });
              } else {
                res.status(400).json({
                  code: 100,
                  message: "Unable to send OTP",
                });
              }
            }
          }
        }
      );
    } else {
      res.status(200).json({
        code: 100,
        message:
          "Phone number does not exist, please sign up or login with correct number",
      });
    }
  } catch (err) {
    console.log(`The error is : ${err}`);
    res.status(500).json({
      code: 100,
      message: "Internal server issue",
    });
  }
});

router.post("/verifyotp", function (req, res, next) {
  console.log("***********VERIFY OTP API******************");
  console.log(req.body);
  var mobile = req.body.mobile;
  var otp = req.body.otp;
  var verification = req.body.verification;
  var device_id = req.body.device_id || "";
  var lat = req.body.lat;
  var lng = req.body.lng;
  var currentTime = getCurrentTime();
  var userId;

  db.query(
    `SELECT id, CONCAT(first_name, " ", last_name)  as name 
    FROM users 
    WHERE phone = ? && otp= ? && designation = ? && department_id = ?`,
    [mobile, otp, "Patient", "3"],
    async function (error, results, fields) {
      if (error) {
        console.log(error);
        res.status(500).json({
          code: 100,
          message: "Unknown Error Ocurred while verifying OTP",
        });
      } else {
        console.log(results);
        if (results.length == 1) {
          userId = results[0].id;
          var user_name = results[0].name;
          console.log("User id is " + userId);

          if (verification == 1) {
            db.query(
              `UPDATE users SET status = ?, device_id=?, updated_at = ? WHERE id = ?`,
              ["1", device_id, currentTime, userId],
              function (error, results, fields) {
                if (error) {
                  console.log(error);
                  res.status(500).json({
                    code: 100,
                    message: "Unknown Error ocurred during verification",
                  });
                } else {
                  console.log(results);
                }
              }
            );
          }

          await db.query(
            `UPDATE users SET device_id = ?, updated_at = ? WHERE id = ?`,
            [device_id, currentTime, userId]
          );

          db.query(
            `SELECT id FROM patients WHERE user_id=?`,
            [userId],
            async function (error, results, fields) {
              if (error) {
                console.log(error);
                res.status(500).json({
                  code: 100,
                  message: "Unknown Error Ocurred while verifying otp",
                });
              } else if (results.length != 0) {
                console.log(results);
                patient_id = results[0].id;

                try {
                  await db.query(
                    "INSERT INTO `addresses`(`owner_id`, `owner_type`, `lat`, `lng`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, ?, ?)",
                    [
                      patient_id,
                      "App\\Models\\Patient",
                      lat,
                      lng,
                      getCurrentTime(),
                      getCurrentTime(),
                    ]
                  );
                  data = {};
                  data.id = patient_id;
                  data.name = user_name;
                  results = await db.query(
                    `SELECT address1, address2, city, zip, lat, lng FROM addresses 
                    WHERE owner_id= ? && owner_type = 'App\\\\Models\\\\Patient'`,
                    [patient_id]
                  );
                  console.log("RESULTS : ", results);
                  if (results.length == 0) {
                    console.log(results);
                    data.address1 = "";
                    data.address2 = "";
                    data.lng = "";
                    data.lat = "";
                    data.city = "";
                    data.zip = "";
                  } else {
                    console.log(results);
                    data.address1 = results[0].address1 || "";
                    data.address2 = results[0].address2 || "";
                    data.lng = results[0].lng || "";
                    data.lat = results[0].lat || "";
                    data.city = results[0].city || "";
                    data.zip = results[0].zip || "";
                  }
                } catch (err) {
                  console.log(
                    "Error while inserting into addresses table ${err} :",
                    err
                  );
                }
                res.status(200).json({
                  code: 200,
                  message: "OTP verification successful",
                  data: data,
                });
              } else {
                console.log(results);
                res.status(200).json({
                  code: 100,
                  message: "Patient does not exist",
                });
              }
            }
          );
        } else if (results.length == 0) {
          console.log(results);
          res.status(200).json({
            code: 100,
            message: "Incorrect OTP, please try with correct OTP",
          });
        } else {
          res.status(500).json({
            code: 100,
            message: "The given phone no. is not unique",
          });
        }
      }
    }
  );
});

router.post("/", async function (req, res, next) {
  console.log("***********LOGIN API************");
  console.log(req.body);
  var mobile = req.body.mobile;
  var password = req.body.password;
  var device_id = req.body.device_id || "";
  var currentTime = getCurrentTime();

  db.query(
    "SELECT * FROM `users` WHERE phone = ? AND designation = ? AND department_id = ? AND status = ?",
    [mobile, "Patient", "3", "1"],
    async function (error, results, fields) {
      if (error) {
        res.status(500).json({
          code: 100,
          message: "Unknown Error Ocurred",
        });
      } else {
        console.log(results);
        if (results.length > 0) {
          hash_password = results[0].password;
          console.log(hash_password);
          hash_password = hash_password.replace(/^\$2y/i, "$2b");
          console.log(hash_password);
          const comparison = await bcrypt.compare(password, hash_password);
          console.log(comparison);
          if (comparison) {
            userid = results[0]["id"];

            var data = {};
            data.name = results[0].first_name + " " + results[0].last_name;
            db.query(
              "SELECT id FROM `patients` WHERE `user_id`=?",
              [userid],
              async function (error, results, fields) {
                if (error) {
                  res.status(500).json({
                    code: 100,
                    message: "Unknown Error Ocurred",
                  });
                } else if (results.length == 0) {
                  console.log(results);
                  res.status(200).json({
                    code: 100,
                    message: "Patient does not exist",
                  });
                } else {
                  await db.query(
                    `UPDATE users SET device_id = ?, updated_at = ? WHERE id = ?`,
                    [device_id, currentTime, userid]
                  );
                  console.log(results);
                  var owner_id = results[0].id;
                  data.id = owner_id;
                  db.query(
                    `SELECT address1, address2, lat, lng, city, zip FROM addresses 
                    WHERE owner_id= ? && owner_type = 'App\\\\Models\\\\Patient'`,
                    [owner_id],
                    function (error, results, fields) {
                      if (error) {
                        console.log(error);
                        res.status(500).json({
                          code: 100,
                          message: "Unknown Error Ocurred",
                        });
                      } else if (results.length == 0) {
                        console.log(results);
                        data.address1 = "";
                        data.address2 = "";
                        data.lng = "";
                        data.lat = "";
                        data.city = "";
                        data.zip = "";
                        res.status(200).json({
                          code: 200,
                          status: 1,
                          message: "Login Successful",
                          data: data,
                        });
                      } else {
                        console.log(results);
                        data.address1 = results[0].address1 || "";
                        data.address2 = results[0].address2 || "";
                        data.lng = results[0].lng || "";
                        data.lat = results[0].lat || "";
                        data.city = results[0].city || "";
                        data.zip = results[0].zip || "";

                        res.status(200).json({
                          code: 200,
                          status: 1,
                          message: "Login Successful",
                          data: data,
                        });
                      }
                    }
                  );
                }
              }
            );
          } else {
            res.status(200).json({
              code: 100,
              message: "Mobile No. and password does not match",
            });
          }
        } else {
          db.query(
            "SELECT * FROM `users` WHERE phone = ?",
            [mobile],
            async function (error, results, fields) {
              if (error) {
                res.status(500).json({
                  code: 100,
                  message: "Unknown Error Ocurred",
                });
              } else if (results.length > 0) {
                if (results[0].designation != "Patient") {
                  res.status(200).json({
                    code: 100,
                    status: results[0].status,
                    message:
                      "This user is already registered with different role. Please try with different Phone & Email.",
                  });
                } else if (results[0].status != "1") {
                  res.status(200).json({
                    code: 200,
                    status: results[0].status,
                    message:
                      "This user is not verified. Please verify first.",
                  });
                } else {
                  res.status(200).json({
                    code: 100,
                    message: "Unknown Error. Please contact customer support",
                  });
                }
              } else {
                res.status(200).json({
                  code: 100,
                  message:
                    "User does not exist, please sign up or login with correct number",
                });
              }
            }
          );
        }
      }
    }
  );
});

module.exports = router;
