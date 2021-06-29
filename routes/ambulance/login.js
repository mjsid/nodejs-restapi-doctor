var express = require("express");
var router = express.Router();
var db = require("../../database");
var bcrypt = require("bcrypt");
const { use } = require("../../app");
const { getCurrentTime, generateOTP, sendOTP } = require("../utils");

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
        "UPDATE `users` SET `otp`=?, `updated_at`=? WHERE phone=? && designation=?",
        [otp, currentTime, mobile, "Ambulance"],
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
                  "This user is registered with a different role or deactivated, please contact customer support",
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
                res.status(200).json({
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
    res.status(500).json({
      code: 100,
      message: "Internal server issue",
    });
  }
});

router.post("/verifyotp", function (req, res, next) {
  var mobile = req.body.mobile;
  var otp = req.body.otp;
  var verification = req.body.verification;
  var device_id = req.body.device_id || "";
  var currentTime = getCurrentTime();
  var userId;

  db.query(
    `SELECT id, CONCAT(first_name, " ", last_name)  as name 
    FROM users 
    WHERE phone = ? && otp= ? &&  designation = ? && department_id = ?`,
    [mobile, otp, "Ambulance", "4"],
    function (error, results, fields) {
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
          ambulance_name = results[0].name;
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
          res.status(200).json({
            code: 200,
            message: "OTP verification successful",
            data: { id: results[0].id, name: ambulance_name },
          });
        } else if (results.length == 0) {
          res.status(200).json({
            code: 100,
            message: "Incorrect OTP, please try with correct OTP",
          });
        } else {
          res.status(200).json({
            code: 100,
            message: "The given phone no. is not unique",
          });
        }
      }
    }
  );
});

router.post("/", async function (req, res, next) {
  console.log(req.body);
  var mobile = req.body.mobile;
  var password = req.body.password;
  var device_id = req.body.device_id || "";
  var currentTime = getCurrentTime();
  db.query(
    `SELECT *, CONCAT(first_name, " ", last_name)  as name 
    FROM users 
    WHERE phone = ? && designation = ? && department_id = ? && status = ?`,
    [mobile, "Ambulance", 4, "1"],
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
            await db.query(
              `UPDATE users SET device_id = ?, updated_at = ? WHERE id = ?`,
              [device_id, currentTime, userid]
            );
            res.status(200).json({
              code: 200,
              status: 1,
              message: "Login Successful",
              data: results[0],
            });
          } else {
            res.status(401).json({
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
                if (results[0].designation != "Ambulance") {
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
