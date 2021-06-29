var express = require("express");
var db = require("../../database");
var router = express.Router();

var path = require("path");
var fs = require("fs");
var glob = require("glob");
var bcrypt = require("bcrypt");

const env = process.env.NODE_ENV || "development";
var config = require("../../config/config.json")[env];
// const { profile } = require("node:console");

function getCurrentTime() {
  var current_date_time = new Date()
    .toISOString()
    .replace("T", " ")
    .substr(0, 19);
  return current_date_time;
}

router.post("/profile/edit", function (req, res, next) {
  console.log("Edit profile");
  console.log(req.body);
  doctor_id = req.body.doctor_id;
  first_name = req.body.first_name || null;
  last_name = req.body.last_name || null;
  phone = req.body.phone || null;
  email = req.body.email;
  gender = req.body.gender;
  qualification = req.body.qualification;
  doctor_department_id = req.body.doctor_department_id;
  specialist = req.body.specialist;
  image = req.body.image || null;
  address1 = req.body.address1;
  address2 = req.body.address2;
  city = req.body.city;
  zip = req.body.zip;
  lat = req.body.lat;
  lng = req.body.lng;
  availability = req.body.availability;
  price = req.body.price;
  consult_mode = req.body.consult_mode;
  user_id = "";

  if (first_name && last_name && phone) {
    db.query(
      `SELECT user_id from doctors where id = ?`,
      [doctor_id],
      function (err, results, fields) {
        if (err) {
          console.log("ERROR fetching user query : ");
          console.log(err);
          res.status(401).json({
            code: 100,
            message: "Unable to fetch user data",
          });
        } else if (results.length == 0) {
          console.log(results);
          res.status(404).json({
            code: 100,
            message: "Doctor not found",
          });
        } else {
          console.log(results);
          user_id = results[0].user_id;

          db.query(
            `UPDATE users SET first_name = ?, last_name = ?, 
                gender = ?, qualification = ?, phone = ?, email = ?, updated_at = ? where id = ?`,
            [
              first_name,
              last_name,
              gender,
              qualification,
              phone,
              email,
              getCurrentTime(),
              user_id,
            ],
            function (err, results, fields) {
              if (err) {
                console.log("ERROR fetching query : ");
                if (err["code"] == "ER_DUP_ENTRY") {
                  console.log(err);
                  if (err["sqlMessage"].match(/@/g)) {
                    res.status(200);
                    res.json({
                      code: 100,
                      message: "User Email Already Exists",
                    });
                  } else {
                    res.status(200);
                    res.json({
                      code: 100,
                      message: "User Phone Number Already Exists",
                    });
                  }
                } else {
                  res.status(500);
                  res.json({ code: 100, message: "Unknown Error Occurred" });
                  console.log(err);
                }
              } else {
                console.log(results);
                console.log("User details updated successfully");

                db.query(
                  `UPDATE doctors SET doctor_department_id = ?, specialist = ?, updated_at = ? where id = ?`,
                  [
                    doctor_department_id,
                    specialist,
                    getCurrentTime(),
                    doctor_id,
                  ],
                  function (err, results, fields) {
                    if (err) {
                      console.log("ERROR fetching department query : ");
                      console.log(err);
                      res.status(401).json({
                        code: 100,
                        message: "Unable to fetch department data",
                      });
                    } else {
                      console.log(results);
                      console.log("Department details updated successfully");

                      db.query(
                        `UPDATE addresses SET address1 = ?, address2 = ?, city = ?, zip = ?, lat = ?, lng = ?, updated_at = ? where owner_id = ?`,
                        [
                          address1,
                          address2,
                          city,
                          zip,
                          lat,
                          lng,
                          getCurrentTime(),
                          doctor_id,
                        ],
                        function (err, results, fields) {
                          if (err) {
                            console.log("ERROR updating address data ");
                            console.log(err);
                            res.status(401).json({
                              code: 100,
                              message: "Unable to update address data",
                            });
                          } else if (results.affectedRows == 0) {
                            db.query(
                              "INSERT INTO `addresses` (`owner_id`, `owner_type`, `address1`, `address2`, `city`, `zip`, `lat`, `lng`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                              [
                                doctor_id,
                                "App\\Models\\Doctor",
                                address1,
                                address2,
                                city,
                                zip,
                                lat,
                                lng,
                                getCurrentTime(),
                                getCurrentTime(),
                              ],
                              function (err, results, fields) {
                                if (err) {
                                  console.log(
                                    "Unable to insert addresses table"
                                  );
                                } else {
                                  console.log("Address added successfully");
                                }
                              }
                            );
                          } else {
                            console.log(results);
                            console.log("Address details updated successfully");
                          }

                          db.query(
                            `UPDATE schedules SET voice = ?, video = ?, text = ?, price = ?, updated_at = ? where doctor_id = ?`,
                            [
                              consult_mode.voice,
                              consult_mode.video,
                              consult_mode.text,
                              price,
                              getCurrentTime(),
                              doctor_id,
                            ],
                            function (err, results, fields) {
                              if (err) {
                                console.log("ERROR fetching schedule data ");
                                console.log(err);
                                res.status(401).json({
                                  code: 100,
                                  message: "Unable to fetch schedule data",
                                });
                              } else {
                                console.log(results);
                                console.log(
                                  "Schedule details updated successfully"
                                );

                                Object.entries(availability).forEach(
                                  ([day, time]) => {
                                    db.query(
                                      `UPDATE schedule_days SET available_from = ?, available_to = ?, updated_at = ? 
                                    where doctor_id = ? && available_on = ? `,
                                      [
                                        time[0],
                                        time[1],
                                        getCurrentTime(),
                                        doctor_id,
                                        day,
                                      ],
                                      function (err, results, fields) {
                                        if (err) {
                                          console.log(
                                            "ERROR fetching schedule days data "
                                          );
                                          console.log(err);
                                          res.status(500).json({
                                            code: 100,
                                            message:
                                              "Unable to fetch schedule days data",
                                          });
                                        } else {
                                          console.log(results);
                                          console.log(
                                            "Schedule days details updated successfully"
                                          );
                                        }
                                      }
                                    );
                                  }
                                );

                                if (image == null) {
                                  console.log("Image is not provided");
                                  res.status(200).json({
                                    code: 200,
                                    message: "All details updated successfully",
                                  });
                                } else {
                                  db.query(
                                    `SELECT id,file_name from media where model_id = ?`,
                                    [user_id],
                                    function (err, results, fields) {
                                      if (err) {
                                        console.log(
                                          "ERROR fetching image query : "
                                        );
                                        console.log(err);
                                        res.status(401).json({
                                          code: 100,
                                          message: "Unable to fetch image data",
                                        });
                                      } else if (results.length != 0) {
                                        console.log(results);
                                        var img_directory = path.resolve(
                                          __dirname,
                                          "../../../../public_html/public/uploads/profile-photos/"
                                        );
                                        img_directory =
                                          img_directory +
                                          "/" +
                                          results[0].id +
                                          "/";
                                        if (!fs.existsSync(img_directory)) {
                                          fs.mkdirSync(img_directory);
                                        }
                                        var img_name = results[0].file_name;
                                        var image_path = path.join(
                                          img_directory,
                                          img_name
                                        );
                                        var buff_img = Buffer.from(
                                          image,
                                          "base64"
                                        );

                                        fs.writeFile(
                                          image_path,
                                          buff_img,
                                          (err) => {
                                            if (err) {
                                              console.log(err);
                                              console.log(
                                                "Profile image not updated"
                                              );
                                              res.status(400);
                                              res.json({
                                                code: 100,
                                                message:
                                                  "Unable to update profile image",
                                              });
                                            } else {
                                              console.log(
                                                "image updated successfully"
                                              );

                                              res.status(200).json({
                                                code: 200,
                                                message:
                                                  "All details updated Successfully",
                                              });
                                            }
                                          }
                                        );
                                      } else {
                                        // updateImage(user_id, first_name, image);
                                        var buff_img = Buffer.from(
                                          image,
                                          "base64"
                                        );
                                        var image_name = first_name + ".jpg";
                                        db.query(
                                          "INSERT INTO `media` (`model_type`, `model_id`, `collection_name`, `file_name`, `mime_type`, `disk`, `size`, `updated_at`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                                          [
                                            "App\\\\Models\\\\User",
                                            user_id,
                                            "profile_photo",
                                            image_name,
                                            "image\\\\jpg",
                                            "public",
                                            buff_img.length,
                                            getCurrentTime(),
                                          ],
                                          function (err, results, fields) {
                                            if (err) {
                                              console.log(
                                                "Unable to update image : ",
                                                err
                                              );
                                              res.status(500).json({
                                                code: 100,
                                                message:
                                                  "Unable to update image",
                                              });
                                            } else {
                                              console.log(
                                                "Updated media table : ",
                                                results
                                              );
                                              var id = results.insertId;
                                              var img_dir = path.resolve(
                                                __dirname,
                                                "../../../../public_html/public/uploads/profile-photos/"
                                              );
                                              img_dir = img_dir + "/" + id;
                                              fs.mkdir(img_dir, function (err) {
                                                if (err) {
                                                  console.log(
                                                    "Unable to create directory ",
                                                    err
                                                  );
                                                }
                                                var image_path = path.join(
                                                  img_dir,
                                                  image_name
                                                );
                                                fs.writeFile(
                                                  image_path,
                                                  buff_img,
                                                  (err) => {
                                                    if (err) {
                                                      console.log(err);
                                                      console.log(
                                                        "Profile image not updated"
                                                      );
                                                    } else {
                                                      res.status(200).json({
                                                        code: 200,
                                                        message:
                                                          "Profile updated successfully",
                                                      });
                                                    }
                                                  }
                                                );
                                              });
                                            }
                                          }
                                        );
                                      }
                                    }
                                  );
                                }
                              }
                            }
                          );
                        }
                      );
                    }
                  }
                );
              }
            }
          );
        }
      }
    );
  } else {
    console.log("mandatory fields missing");
    res.status(500).json({
      code: 100,
      message: "mandatory fields missing",
    });
  }
});

router.post("/profile/changepassword", async function (req, res, next) {
  console.log("************Change password API***************");
  console.log(req.body);
  var doctor_id = req.body.doctor_id;
  var new_password = await bcrypt.hash(req.body.new_password, 10);
  var current_time = getCurrentTime();

  if (!new_password) {
    res.status(422).json({
      code: 100,
      message: "Empty values not permitted",
    });
  } else {
    db.query(
      `SELECT u.id as user_id, u.password 
      FROM doctors as d, users as u
      WHERE d.id=? && d.user_id=u.id`,
      [doctor_id],
      async function (err, results, fields) {
        if (err) {
          console.log("Unable to get user id");
          res.status(404).json({
            code: 100,
            message: "Unable to find doctor",
          });
        } else if (results.length == 0) {
          res.status(200).json({
            code: 100,
            message: "Unable to find doctor",
          });
        } else {
          console.log(results);
          var user_id = results[0].user_id;
          var hash_password = results[0].password;
          hash_password = hash_password.replace(/^\$2y/i, "$2b");

          db.query(
            "UPDATE `users` SET `password`=?, `updated_at`=? WHERE id=?",
            [new_password, current_time, user_id],
            function (err, results, fields) {
              if (err) {
                console.log("Unable to update password : ", err);
                res.status(401).json({
                  code: 100,
                  message: "Unable to update password",
                });
              } else if (results.affectedRows > 0) {
                console.log(results);
                res.status(200).json({
                  code: 200,
                  message: "Password changed successfully",
                });
              } else {
                res.status(500).json({
                  code: 100,
                  message: "Unable to change password",
                });
              }
            }
          );
        }
      }
    );
  }
});

router.get("/profile", function (req, res, next) {
  var doctor_id = req.query.doctor_id;
  var profile_data = {};

  db.query(
    `SELECT u.first_name, u.last_name, u.phone, u.email, u.gender, u.qualification, d.doctor_department_id, d.specialist FROM doctors as d, users as u WHERE d.id=? && d.user_id=u.id`,
    [doctor_id],
    function (err, results, fields) {
      if (err) {
        console.log("ERROR fetching query : ");
        console.log(err);
        res.status(401).json({
          code: 100,
          message: "Unable to fetch data",
        });
      } else if (results.length > 0) {
        var data = results[0];
        var doctor_department_id = data.doctor_department_id;
        profile_data.first_name = data.first_name;
        profile_data.last_name = data.last_name;
        profile_data.phone = data.phone;
        profile_data.email = data.email;
        profile_data.gender = data.gender;
        profile_data.qualification = data.qualification || "";
        profile_data.specialist = data.specialist;
        profile_data.doctor_department_id = data.doctor_department_id;
        getImageUrl(doctor_id, function (image_url) {
          profile_data.image = image_url;
          getAddress(doctor_id, function (data) {
            profile_data.address1 = (data || {}).address1 || "";
            profile_data.address2 = (data || {}).address2 || "";
            profile_data.city = (data || {}).city || "";
            profile_data.zip = (data || {}).zip || "";
            profile_data.lat = (data || {}).lat || "";
            profile_data.lng = (data || {}).lng || "";
            getSchedule(
              doctor_id,
              function (timings, consult_mode, price, nextAvailability) {
                profile_data.availability = timings;
                profile_data.price = price || 0;
                profile_data.consult_mode = consult_mode;
                profile_data.NextAvailability = nextAvailability;
                console.log("profile_data");
                console.log(profile_data);
                res.status(200).send({
                  code: 200,
                  data: profile_data,
                });
              }
            );
          });
        });
      } else {
        res.status(500).json({
          code: 100,
          message: "Unable to fetch doctor data, ",
        });
      }
    }
  );
});

router.get("/address", function (req, res, next) {
  var owner_id = req.query.owner_id;
  var owner_type = req.query.owner_type;

  db.query(
    `SELECT address1, address2, city, zip, lat, lng FROM addresses
    WHERE owner_id = ? && owner_type = ?`,
    [owner_id, owner_type],
    function (err, results, fields) {
      if (err) {
        console.log("ERROR fetching query : ");
        console.log(err);
        res.status(401).json({
          code: 100,
          message: "Unable to fetch data",
        });
      } else if (results.length > 0) {
        console.log(results);
        res.status(200).send({
          code: 200,
          data: results,
        });
      } else {
        console.log(results);
        res.status(500).json({
          code: 100,
          message: "Unable to fetch doctor data, ",
        });
      }
    }
  );
});

router.get("/earnings", function (req, res, next) {
  var doctor_id = req.query.doctor_id;

  db.query(
    `SELECT cycle_start, cycle_end, amount, is_paid, item_count 
    FROM commission_payouts WHERE department_id = ? &&  model_id = ?`,
    ["2", doctor_id],
    function (err, results, fields) {
      if (err) {
        console.log("ERROR fetching query : ");
        console.log(err);
        res.status(401).json({
          code: 100,
          message: "Unable to fetch data",
        });
      } else if (results.length > 0) {
        console.log(results);
        var data = results;
        for (var i = 0; i < results.length; i++) {
          data[i].cycle_start = results[i].cycle_start || "";
          data[i].cycle_end = results[i].cycle_end || "";
          data[i].amount = results[i].amount || "";
          data[i].is_paid = results[i].is_paid || "";
          data[i].item_count = results[i].item_count || "";
        }
        res.status(200).send({
          code: 200,
          data: results,
        });
      } else {
        console.log(results);
        res.status(500).json({
          code: 100,
          message: "Unable to fetch doctor  earnings data, ",
        });
      }
    }
  );
});

function updateImage(user_id, first_name, image) {
  var buff_img = Buffer.from(image, "base64");
  var image_name = first_name + ".jpg";
  db.query(
    "INSERT INTO `media` (`model_type`, `model_id`, `collection_name`, `file_name`, `mime_type`, `disk`, `size`, `updated_at`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      "App\\\\Models\\\\User",
      user_id,
      "profile_photo",
      image_name,
      "image\\\\jpg",
      "public",
      buff_img.length,
      getCurrentTime(),
    ],
    function (err, results, fields) {
      if (err) {
        console.log("Unable to update image : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to update image",
        });
      } else {
        console.log("Updated media table : ", results);
        var id = results.insertId;
        var img_dir = path.resolve(
          __dirname,
          "../../../../public_html/public/uploads/profile-photos/"
        );
        img_dir = img_dir + "/" + id;
        fs.mkdir(img_dir, function (err) {
          if (err) {
            console.log("Unable to create directory ", err);
          }
          var image_path = path.join(img_dir, image_name);
          fs.writeFile(image_path, buff_img, (err) => {
            if (err) {
              console.log(err);
              console.log("Profile image not updated");
            } else {
              res.status(200).json({
                code: 200,
                message: "Profile updated successfully",
              });
            }
          });
        });
      }
    }
  );
}
function getImageUrl(doctor_id, cb) {
  db.query(
    `SELECT m.file_name, m.mime_type, m.id as mediaId FROM doctors as d, users as u, media as m WHERE d.id=? && d.user_id=u.id && u.id=m.model_id`,
    [doctor_id],
    function (err, results, fields) {
      if (err) {
        console.log(err);
      } else {
        console.log(results);
        if (results.length > 0) {
          var data = results[0];
          image_url =
            config.profile_photo + data.mediaId + "/" + data.file_name;
          cb(image_url);
        } else {
          image_url = "";
          cb(image_url);
        }
      }
    }
  );
}

function getAddress(doctor_id, cb) {
  db.query(
    `SELECT address1, address2, city, zip, lat, lng FROM addresses WHERE owner_id=? && owner_type="App\\\\Models\\\\Doctor"`,
    [doctor_id],
    function (err, results, fields) {
      console.log(results);
      cb(results[0]);
    }
  );
}

function getSchedule(doctor_id, cb) {
  db.query(
    `SELECT id, voice, video, text, price FROM schedules WHERE doctor_id=? limit 1`,
    [doctor_id],
    function (err, results, fields) {
      if (results.length > 0) {
        var schedule_id = results[0].id;
        var price = results[0].price;
        var voice = results[0].voice;
        var video = results[0].video;
        var text = results[0].text;
        var consult_mode = {};
        consult_mode.voice = voice;
        consult_mode.video = video;
        consult_mode.text = text;
        db.query(
          `SELECT available_on, available_from, available_to FROM schedule_days WHERE schedule_id=? && doctor_id=?`,
          [schedule_id, doctor_id],
          function (err, results, fields) {
            if (results.length > 0) {
              console.log(results);
              var availableToday = 0;
              var timings = {};
              var nextAvailability = {};
              var currentDateTime = new Date();
              var currentSecond = currentDateTime.getSeconds();
              var currentMinute = currentDateTime.getMinutes();
              var currentHour = currentDateTime.getHours();
              var currentDay = currentDateTime.getDay();
              var weekday = new Array(7);
              weekday[0] = "Sunday";
              weekday[1] = "Monday";
              weekday[2] = "Tuesday";
              weekday[3] = "Wednesday";
              weekday[4] = "Thursday";
              weekday[5] = "Friday";
              weekday[6] = "Saturday";
              // currentDay = weekday[currentDay];

              for (var i = 0; i < results.length; i++) {
                timings[results[i].available_on] = [
                  results[i].available_from,
                  results[i].available_to,
                ];
                savedDay = weekday.indexOf(results[i].available_on);
                if (currentDay == savedDay) {
                  var savedTime = results[i].available_to.split(":");
                  var savedHour = savedTime[0];
                  var savedMinute = savedTime[1];
                  var savedSecond = savedTime[2];

                  if (currentHour < savedHour) {
                    availableToday = 1;
                  } else if (currentHour == savedHour) {
                    if (currentMinute < savedMinute) {
                      availableToday = 1;
                    } else if (currentMinute == savedMinute) {
                      if (currentSecond <= savedSecond) {
                        availableToday = 1;
                      }
                    }
                  }

                  if (availableToday == 1) {
                    nextAvailability[results[i].available_on] = [
                      results[i].available_from,
                      results[i].available_to,
                    ];
                  }
                }
              }
              var daysInWeek = 0;
              if (availableToday == 0) {
                var availabilityFound = 0;

                while (availabilityFound == 0 && daysInWeek <= 6) {
                  currentDay++;
                  if (currentDay == 7) {
                    currentDay = 0;
                  }

                  if (typeof timings[weekday[currentDay]] == "undefined") {
                    console.log("This is undefined");
                    continue;
                  }
                  console.log(currentDay);
                  if (timings[weekday[currentDay]][1] != "00:00:00") {
                    nextAvailability[weekday[currentDay]] =
                      timings[weekday[currentDay]];
                    availabilityFound = 1;
                  }
                  daysInWeek++;
                }
              }

              // const savedWeekdays = Object.keys(timings);

              cb(timings, consult_mode, price, nextAvailability);
            } else {
              cb({}, consult_mode, price, {});
            }
          }
        );
      } else {
        cb({}, {}, null, {});
      }
    }
  );
}

router.get("/del", function (req, res, next) {
  var dir_name = path.resolve(__dirname, "../../routes");
  console.log(dir_name);
  glob(dir_name + "/**/*", function (err, files) {
    if (err) {
      console.log(err);
    } else {
      console.log(files);
      res.status(200).json({ data: files });
    }
  });
});

router.get("/amount", function (req, res, next) {
  console.log("******************PAYABLE AMOUNT API***************");
  const doctor_id = req.query.doctor_id;

  db.query(
    `SELECT sum(payable_amount) as payable_amount FROM commission_history WHERE department_id=? && model_id=?`,
    [2, doctor_id],
    function (err, results, fields) {
      if (err) {
        console.log("Unable to get payable amount : ", err);
        res.status(500).send({
          code: 100,
          message: "Unable to get payable amount",
        });
      } else {
        console.log(results);
        if (results[0].payable_amount == null) {
          results[0].payable_amount = 0;
        }
        res.status(200).json({
          code: 200,
          data: results[0],
        });
      }
    }
  );
});

module.exports = router;
