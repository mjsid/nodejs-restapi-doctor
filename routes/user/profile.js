var express = require("express");
var db = require("../../database");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
var bcrypt = require("bcrypt");
var { getCurrentTime } = require("../utils");
var router = express.Router();

const env = process.env.NODE_ENV || "development";
var config = require("../../config/config.json")[env];

router.post("/changepassword", async function (req, res, next) {
  console.log("************Change password API***************");
  console.log(req.body);
  var patient_id = req.body.patient_id;
  // var old_password = req.body.old_password;
  var new_password = await bcrypt.hash(req.body.new_password, 10);
  var current_time = getCurrentTime();

  // if (!old_password || !new_password) {
  if (!new_password) {
    res.status(422).json({
      code: 100,
      message: "Empty values not permitted",
    });
  } else {
    db.query(
      `SELECT u.id as user_id, u.password FROM patients as p, users as u
        WHERE p.id=? && p.user_id=u.id`,
      [patient_id],
      async function (err, results, fields) {
        if (err) {
          console.log("Unable to get user id");
          res.status(404).json({
            code: 100,
            message: "Unable to find patient",
          });
        } else if (results.length == 0) {
          res.status(200).json({
            code: 100,
            message: "Unable to find patient",
          });
        } else {
          console.log(results);
          var user_id = results[0].user_id;
          var hash_password = results[0].password;
          hash_password = hash_password.replace(/^\$2y/i, "$2b");
          // const comparison = await bcrypt.compare(old_password, hash_password);
          // if (comparison) {
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
          // } else {
          //   res.status(401).json({
          //     code: 100,
          //     message: "Old password is not matching",
          //   });
          // }
        }
      }
    );
  }
});

router.post("/edit", function (req, res, next) {
  console.log("user edit profile");
  console.log(req.body);
  var patient_id = req.body.patient_id;
  var first_name = req.body.first_name;
  var last_name = req.body.last_name;
  var phone = req.body.phone;
  var email = req.body.email;
  var gender = req.body.gender;
  var image = req.body.image || null;
  var user_id = "";

  db.query(`SELECT user_id from patients Where id=?`, [patient_id], function (
    err,
    results,
    fields
  ) {
    if (err) {
      console.log("ERROR fetching user query : ", err);
      res.status(401).json({
        code: 100,
        message: "Unable to fetch data",
      });
    } else if (results.length > 0) {
      user_id = results[0].user_id;
      console.log("USER ID :", user_id);
      db.query(
        `UPDATE users SET first_name=?, last_name=?, phone=?, email=?, gender=? WHERE id=?`,
        [first_name, last_name, phone, email, gender, user_id],
        function (err, results, fields) {
          if (err) {
            console.log("Unable to update user table");
            if (err["code"] == "ER_DUP_ENTRY") {
              console.log(err);
              if (err["sqlMessage"].match(/@/g)) {
                res.status(200);
                res.json({ code: 100, message: "User Email Already Exists" });
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
            }
          } else {
            console.log(results);
            console.log("User details updated successfully");
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
                    console.log("ERROR fetching image query : ");
                    console.log(err);
                    res.status(401).json({
                      code: 100,
                      message: "Unable to fetch image data",
                    });
                  } else if (results.length > 0) {
                    console.log(results);
                    var img_directory = path.resolve(
                      __dirname,
                      "../../../../public_html/public/uploads/profile-photos/"
                    );
                    img_directory = img_directory + "/" + results[0].id;

                    if (!fs.existsSync(img_directory)) {
                      fs.mkdirSync(img_directory);
                    }
                    var img_name = results[0].file_name;
                    var image_path = path.join(img_directory, img_name);
                    var buff_img = Buffer.from(image, "base64");

                    fs.writeFile(image_path, buff_img, (err) => {
                      if (err) {
                        console.log(err);
                        console.log("Profile image not updated");
                        res.status(400);
                        res.json({
                          code: 100,
                          message: "Unable to update profile image",
                        });
                      } else {
                        console.log("image updated successfully");

                        res.status(200).json({
                          code: 200,
                          message: "All details updated Successfully",
                        });
                      }
                    });
                  } else {
                    const image_name = uuidv4() + ".jpg";
                    console.log("Image name : ", image_name);
                    db.query(
                      "INSERT INTO media (`model_id`, `collection_name`, `file_name`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, ?)",
                      [
                        user_id,
                        "profile_photo",
                        image_name,
                        getCurrentTime(),
                        getCurrentTime(),
                      ],
                      function (err, results, fields) {
                        if (err) {
                          console.log("Unable to upload profile image : ", err);
                          res.status(500).json({
                            code: 100,
                            message: "Unable to upload profile image",
                          });
                        } else {
                          console.log(results);
                          var buff_img = Buffer.from(image, "base64");
                          var media_id = results.insertId;
                          var image_directory = path.join(
                            path.resolve(
                              __dirname,
                              "../../../../public_html/public/uploads/profile-photos"
                            ),
                            media_id.toString()
                          );
                          console.log("Image Directory : ", image_directory);
                          if (!fs.existsSync(image_directory)) {
                            fs.mkdirSync(image_directory);
                          }
                          var image_path = path.join(
                            image_directory,
                            image_name
                          );
                          console.log("profile pic path : ", image_path);
                          fs.writeFile(image_path, buff_img, (err) => {
                            if (err) {
                              res.status(500);
                              res.json({
                                code: 100,
                                message: "Unable to save profile pic",
                              });
                            } else {
                              res.status(200).json({
                                code: 200,
                                message: "Profile image uploaded successfully",
                              });
                            }
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
    } else {
      console.log(results);
      res.status(200).json({
        code: 100,
        message: "User not found",
      });
    }
  });
});

router.get("/", function (req, res, next) {
  var user_id = req.query.user_id;
  var profile_data = {};

  db.query(
    `SELECT p.id as patient_id, u.first_name, u.last_name, u.phone, u.email, u.gender FROM patients as p, users as u WHERE p.id = ? && p.user_id=u.id`,
    [user_id],
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

        profile_data.id = data.patient_id;
        profile_data.first_name = data.first_name;
        profile_data.last_name = data.last_name;
        profile_data.phone = data.phone;
        profile_data.email = data.email;
        profile_data.gender = data.gender;

        getImageUrl(user_id, function (image_url) {
          profile_data.image = image_url;
          getAddress(user_id, function (data) {
            profile_data.address1 = (data || {}).address1 || "";
            profile_data.address2 = (data || {}).address2 || "";
            profile_data.city = (data || {}).city || "";
            profile_data.zip = (data || {}).zip || "";
            profile_data.lat = (data || {}).lat || null;
            profile_data.lng = (data || {}).lng || null;

            console.log("Patient profile_data");
            console.log(profile_data);
            res.status(200).send({
              code: 200,
              data: profile_data,
            });
          });
        });
      } else {
        res.status(500).json({
          code: 100,
          message: "Unable to fetch patient data, ",
        });
      }
    }
  );
});

router.get("/aboutus", function (req, res, next) {
  console.log("*************About us*****************");
  var about = req.query.about;

  db.query(`SELECT content FROM cms WHERE type = ?`, [about], function (
    err,
    results,
    fields
  ) {
    if (err) {
      console.log(err);
      console.log("Unable to fetch about us :", err);
      res.status(500).json({
        code: 100,
        message: "Unable to fetch about us ",
      });
    } else if (results.length == 0) {
      console.log(results);
      res.status(200).json({
        code: 100,
        message: "No information available",
      });
    } else {
      console.log(results);
      res.status(200).json({
        code: 200,
        message: "Information retrieved successfully",
        data: results,
      });
    }
  });
});

router.post("/contact", function (req, res, next) {
  console.log("*************About us*****************");
  var fullName = req.body.fullName;
  var email = req.body.email;
  var subject = req.body.subject;
  var message = req.body.message;

  db.query(
    `INSERT INTO contact_us (full_name, email,	subject, message, created_at, updated_at) 
    VALUES (?, ?, ?, ?, ?, ?)`,
    [fullName, email, subject, message, getCurrentTime(), getCurrentTime()],
    function (err, results, fields) {
      if (err) {
        console.log(err);
        console.log("Unable to add information in contact table :", err);
        res.status(500).json({
          code: 100,
          message: "Unable to add information in contact table ",
        });
      } else if (results.insertId > 0) {
        console.log(results);
        res.status(200).json({
          code: 200,
          message: "Contact information saved",
        });
      } else {
        console.log(results);
        res.status(200).json({
          code: 100,
          message: "Unable to update contact information",
        });
      }
    }
  );
});

function getImageUrl(user_id, cb) {
  db.query(
    `SELECT m.file_name, m.mime_type, m.id as mediaId FROM patients as p, users as u, media as m WHERE p.id=? && p.user_id=u.id && u.id=m.model_id`,
    [user_id],
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

function getAddress(user_id, cb) {
  db.query(
    `SELECT address1, address2, city, zip, lat, lng FROM addresses WHERE owner_id=? && owner_type="App\\\\Models\\\\Patient"`,
    [user_id],
    function (err, results, fields) {
      console.log(results);
      cb(results[0]);
    }
  );
}

module.exports = router;
