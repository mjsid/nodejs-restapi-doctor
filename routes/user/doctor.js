var express = require("express");
var db = require("../../database");
var router = express.Router();

const env = process.env.NODE_ENV || "development";
var config = require("../../config/config.json")[env];

router.get("/department", function (req, res, next) {
  db.query(
    `SELECT id, title, image FROM doctor_departments `,
    function (err, results, fields) {
      if (err) {
        console.log("ERROR fetching query : ");
        console.log(err);
        res.status(500).json({
          code: 100,
          message: "Error fetching departments",
        });
      } else {
        console.log(results);
        if (results.length > 0) {
          for (var i = 0; i < results.length; i++) {
            if (results[i].image) {
              results[i].image = config.doctor_departments + results[i].image;
            } else {
              results[i].image = "http://dotrx.in/images/no-image.png";
            }
          }
        } else {
          res.status(200).json({
            code: 100,
            message: "No Data available",
          });
        }
        console.log(results);
        res.status(200).json({
          code: 200,
          data: results,
        });
      }
    }
  );
});

router.get("/", async function (req, res, next) {
  var doctor_department_id = req.query.doctor_department_id;
  var profile_data = [];

  try {
    var userData = await db.query(
      `SELECT u.id as user_id, u.first_name, u.last_name, u.qualification, d.id as doctor_id, d.specialist 
      FROM doctors as d, users as u 
      WHERE d.doctor_department_id=? && d.user_id=u.id`,
      [doctor_department_id]
    );

    if (userData.length > 0) {
      console.log(userData.length);
      var data = userData;

      for (var i = 0; i < userData.length; i++) {
        profile_data[i] = {};
        profile_data[i].user_id = data[i].user_id || "";
        profile_data[i].first_name = data[i].first_name || "";
        profile_data[i].last_name = data[i].last_name || "";
        profile_data[i].qualification = data[i].qualification || "";
        profile_data[i].doctor_id = data[i].doctor_id || "";
        profile_data[i].specialist = data[i].specialist || "";

        var imageData = await db.query(
          `SELECT m.file_name, m.mime_type, m.id as mediaId 
              FROM doctors as d, users as u, media as m 
              WHERE d.id=? && d.user_id=u.id && u.id=m.model_id`,
          [profile_data[i].doctor_id]
        );
        console.log(imageData);

        if (imageData.length > 0) {
          var imageData = imageData[0];
          profile_data[i].image =
            config.profile_photo +
            imageData.mediaId +
            "/" +
            imageData.file_name;
        } else {
          profile_data[i].image = "http://dotrx.in/images/no-image.png";
        }

        var addressData = await db.query(
          `SELECT address1, lat, lng FROM addresses 
          WHERE owner_id=? && owner_type="App\\\\Models\\\\Doctor"`,
          [profile_data[i].doctor_id]
        );
        console.log(addressData);

        if (addressData.length > 0) {
          addressData = addressData[0];
          profile_data[i].address = addressData.address1 || "";
          profile_data[i].lat = addressData.lat || "";
          profile_data[i].lng = addressData.lng || "";
        } else {
          profile_data[i].address = "";
          profile_data[i].lat = "";
          profile_data[i].lng = "";
        }

        var scheduleData = await db.query(
          `SELECT id, voice, video, text, price FROM schedules WHERE doctor_id=? limit 1`,
          [profile_data[i].doctor_id]
        );
        console.log(scheduleData);
        var scheduleId;

        if (scheduleData.length > 0) {
          scheduleData = scheduleData[0];
          profile_data[i].price = scheduleData.price || 0;
          profile_data[i].consult_mode = {
            voice: scheduleData.voice || 0,
            video: scheduleData.video || 0,
            text: scheduleData.text || 0,
          };
          scheduleId = scheduleData.id;
        } else {
          profile_data[i].price = 0;
          profile_data[i].consult_mode = {
            voice: 0,
            video: 0,
            text: 0,
          };
        }

        if (scheduleId) {
          var availabilityData = await db.query(
            `SELECT available_on, available_from, available_to 
            FROM schedule_days WHERE schedule_id=? && doctor_id=?`,
            [scheduleId, profile_data[i].doctor_id]
          );
          console.log(availabilityData);

          if (availabilityData.length > 0) {
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
            var docAvailabilityDays = 0;

            for (var j = 0; j < availabilityData.length; j++) {
              if (
                availabilityData[j].available_from == "00:00:00" &&
                availabilityData[j].available_to == "00:00:00"
              ) {
                docAvailabilityDays++;
              }
              timings[availabilityData[j].available_on] = [
                availabilityData[j].available_from,
                availabilityData[j].available_to,
              ];
              savedDay = weekday.indexOf(availabilityData[j].available_on);
              if (currentDay == savedDay) {
                var savedTime = availabilityData[j].available_to.split(":");
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
                  nextAvailability[availabilityData[j].available_on] = [
                    availabilityData[j].available_from,
                    availabilityData[j].available_to,
                  ];
                }
              }
            }
            console.log(timings);

            if (docAvailabilityDays == availabilityData.length) {
              profile_data[i].availability = "";
            } else {
              profile_data[i].availability = timings || "";
              if (availableToday == 0) {
                var availabilityFound = 0;
                var daysInWeek = 0;
                while (availabilityFound == 0 && daysInWeek <= 6) {
                  currentDay++;
                  daysInWeek++;
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
                }
              }
            }

            console.log(" ===============================", nextAvailability);
            profile_data[i].nextAvailability =
              Object.keys(nextAvailability)[0] || "";
          } else {
            profile_data[i].availability = "";
            profile_data[i].nextAvailability = "";
          }
        } else {
          profile_data[i].availability = "";
          profile_data[i].nextAvailability = "";
        }
      }

      var available_doctors = profile_data.filter(
        (data) => data.availability != ""
      );
      console.log("profile_data");
      console.log(available_doctors);
      if (available_doctors.length == 0) {
        res.status(200).json({
          code: 100,
          message: "Unable to fetch doctor data, ",
        });
      } else {
        res.status(200).send({
          code: 200,
          data: available_doctors,
        });
      }
    } else {
      res.status(200).json({
        code: 100,
        message: "Unable to fetch doctor data, ",
      });
    }
  } catch (error) {
    res.status(500).json({
      code: 100,
      message: "Error Occurred ",
    });
    console.log(error);
    throw new Error(error);
  }
});

module.exports = router;
