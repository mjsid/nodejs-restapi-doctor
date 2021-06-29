var express = require("express");
var router = express.Router();
var path = require("path");
var fs = require("fs");
var db = require("../../database");

const AMBULANCE_IMAGE = "http://dotrx.in/public/images/ambulance";
const NO_IMAGE = "http://dotrx.in/images/no-image.png";

function getCurrentTime() {
  var current_date_time = new Date()
    .toISOString()
    .replace("T", " ")
    .substr(0, 19);
  return current_date_time;
}

router.get("/", function (req, res, next) {
  var user_id = req.query.user_id;
  db.query(
    `SELECT id as ambulance_id, vehicle_number, vehicle_model, image, amenities, price, is_available,vehicle_type, created_at, updated_at FROM ambulances WHERE user_id=?`,
    [user_id],
    async function (err, results, fields) {
      if (err) {
        console.log("Unable to get ambulance : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to get ambulance",
        });
      } else {
        for (var i = 0; i < results.length; i++) {
          if (results[i].image) {
            results[i].image = AMBULANCE_IMAGE + "/" + results[i].image;
          } else {
            results[i].image = NO_IMAGE;
          }
        }
        res.status(200).json({
          code: 200,
          data: results,
        });
      }
    }
  );
});

router.post("/add", function (req, res, next) {
  console.log("**********Add ambulance*********");
  console.log(req.body);
  var user_id = req.body.user_id;
  var title = req.body.title;
  var image = req.body.image;
  var rc = req.body.rc;
  var vehicle_type = req.body.vehicle_type;
  var amenities = req.body.amenities;
  var price = req.body.price;
  var buff_image = Buffer.from(image, "base64");

  db.query(
    "INSERT INTO `ambulances` (`user_id`, `vehicle_number`, `vehicle_model`, `price`, `amenities`, `vehicle_type`, `created_at`, `updated_at`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [
      user_id,
      rc,
      title,
      parseInt(price),
      amenities,
      vehicle_type,
      getCurrentTime(),
      getCurrentTime(),
    ],
    function (err, results, fields) {
      if (err) {
        console.log("Unable to add ambulance : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to add ambulance",
        });
      } else {
        var ambulance_id = results.insertId;
        var img_directory = path.resolve(
          __dirname,
          "../../../../public_html/public/images/ambulance"
        );
        var image_name = ambulance_id.toString() + "_" + "ambulance" + ".jpg";
        var image_path = path.join(img_directory, image_name);
        fs.writeFile(image_path, buff_image, (err) => {
          if (err) {
            res.status(500);
            res.json({
              code: 100,
              message: "Unable to save ambulance image",
            });
          } else {
            db.query(
              `UPDATE ambulances SET image = ?, updated_at=? WHERE id=?`,
              [image_name, getCurrentTime(), ambulance_id],
              function (err, results, fields) {
                if (err) {
                  res.status(500).json({
                    code: 100,
                    message: "Unable to update image for ambulance",
                  });
                } else if (results.affectedRows > 0) {
                  console.log(results);
                  res.status(200).json({
                    code: 200,
                    message: "Ambulance added successfully",
                    data: {
                      id: ambulance_id,
                    },
                  });
                } else {
                  res.status(500).json({
                    code: 100,
                    message: "Unable to update image for ambulance",
                  });
                }
              }
            );
          }
        });
      }
    }
  );
});

router.post("/availability/change", function (req, res, next) {
  console.log("************** Change availability API**************");
  var ambulance_id = req.body.ambulance_id;
  var availability = req.body.availability;

  db.query(
    `UPDATE ambulances SET is_available=? WHERE id=?`,
    [availability, ambulance_id],
    function (err, results, fields) {
      if (err) {
        console.log("Unable to update availability : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to update availability",
        });
      } else if (results.affectedRows > 0) {
        res.status(200).json({
          code: 200,
          message: "Availability updated successfully",
        });
      } else {
        res.status(404).json({
          code: 100,
          message: "Ambulance not found",
        });
      }
    }
  );
});

router.post("/edit", function (req, res, next) {
  console.log("***************Edit Ambulance API***************");
  var ambulance_id = req.body.ambulance_id;
  var rc = req.body.rc;
  var title = req.body.title;
  var image = req.body.image || null;
  var amenities = req.body.amenities;
  var vehicle_type = req.body.vehicle_type;
  var price = req.body.price;

  if (image) {
    var buff_image = Buffer.from(image, "base64");
    var img_directory = path.resolve(
      __dirname,
      "../../../../public_html/public/images/ambulance"
    );
    var image_name = ambulance_id.toString() + "_" + "ambulance" + ".jpg";
    var image_path = path.join(img_directory, image_name);
    fs.writeFile(image_path, buff_image, (err) => {
      if (err) {
        res.status(500);
        res.json({
          code: 100,
          message: "Unable to save image",
        });
      } else {
        db.query(
          `UPDATE ambulances SET image=? WHERE id=?`,
          [image_path, ambulance_id],
          function (err, results, fields) {
            if (err) {
              console.log("Unable to update image : ", err);
            } else if (results.affectedRows > 0) {
              console.log("Image update successfully");
            } else {
              console.log("Unable to update image");
            }
          }
        );
      }
    });
  }

  db.query(
    `UPDATE ambulances SET vehicle_number=?, vehicle_model=? , amenities=?, vehicle_type=?, updated_at=? WHERE id=?`,
    [rc, title, amenities, vehicle_type, getCurrentTime(), ambulance_id],
    function (err, results, fields) {
      if (err) {
        console.log("Unable to update ambulance details : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to update ambulance details",
        });
      } else if (results.affectedRows > 0) {
        res.status(200).json({
          code: 200,
          message: "Ambulance details has been updated successfully",
        });
      } else {
        res.status(404).json({
          code: 100,
          message: "Ambulance not found",
        });
      }
    }
  );
});

router.delete("/delete", function (req, res, next) {
  console.log("*************DELETE API****************");
  var ambulance_id = req.query.ambulance_id;
  db.query(
    `DELETE FROM ambulances WHERE id=?`,
    [ambulance_id],
    function (err, results, fields) {
      if (err) {
        console.log("Unable to delete ambulance : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to delete ambulance",
        });
      } else if (results.affectedRows > 0) {
        console.log(results);
        res.status(200).json({
          code: 200,
          message: "Ambulance details deleted successfully",
        });
      } else {
        res.status(404).json({
          code: 100,
          message: "Ambulance not available",
        });
      }
    }
  );
});

router.get("/type", function (req, res, next) {
  console.log("**************Ambulance type*******************");
  db.query(
    `SELECT id, title FROM ambulance_type order by title`,
    [],
    function (err, results, fields) {
      if (err) {
        console.log("Unable to fetch ambulance type : ", err);
        res.status(500).json({
          code: 100,
          message: "Unknown Error ocurred during fetching of ambulance type",
        });
      } else {
        res.status(200).json({
          code: 200,
          data: results,
        });
      }
    }
  );
});

router.get("/amenities", function (req, res, next) {
  console.log("**************Ambulance type*******************");
  db.query(
    `SELECT id, title FROM ambulance_amenities order by title`,
    [],
    function (err, results, fields) {
      if (err) {
        console.log("Unable to fetch ambulance amenities : ", err);
        res.status(500).json({
          code: 100,
          message:
            "Unknown Error ocurred during fetching of ambulance amenities",
        });
      } else {
        res.status(200).json({
          code: 200,
          data: results,
        });
      }
    }
  );
});

router.get("/earnings", function (req, res, next) {
  var ambulance_id = req.query.ambulance_id;

  db.query(
    `SELECT cycle_start, cycle_end, amount, is_paid, item_count 
    FROM commission_payouts WHERE department_id = ? &&  model_id = ?`,
    ["4", ambulance_id],
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
          message: "Unable to fetch ambulance earnings data, ",
        });
      }
    }
  );
});

module.exports = router;
