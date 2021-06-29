var express = require("express");
var db = require("../../database");
var router = express.Router();
var { getCurrentTime } = require("../utils");

const PROFILE_IMAGE_PATH = "http://dotrx.in/public/uploads/profile-photos/";
const NO_IMAGE = "http://dotrx.in/images/no-image.png";
const REPORT_PATH = "http://dotrx.in/public/images/reports";

router.get("/lists", async function (req, res, next) {
  console.log("*************list lab*****************");
  var lab_list = [];

  try {
    var lab_data = await db.query(
      `SELECT CONCAT(u.first_name, " ", u.last_name) as name, l.id as lab_id 
    FROM lab_technicians as l, users as u 
    WHERE l.user_id=u.id`
    );

    if (lab_data.length == 0) {
      res.status(200).json({
        code: 100,
        message: "No items in lab",
      });
    } else {
      console.log(lab_data);

      for (var i = 0; i < lab_data.length; i++) {
        lab_list[i] = {};
        lab_list[i].lab_id = lab_data[i].lab_id;
        lab_list[i].name = lab_data[i].name;

        var starting_price = await db.query(
          `SELECT MIN(price) as starting_price FROM lab_tests WHERE lab_id = ?`,
          [lab_list[i].lab_id]
        );
        console.log(starting_price);

        if (starting_price.length == 0) {
          lab_list[i].starting_price = 0;
        } else {
          lab_list[i].starting_price = starting_price[0].starting_price || 0;
        }

        var image_data = await db.query(
          `SELECT m.file_name, m.id as mediaID
                  FROM lab_technicians as l, users as u, media as m
                  WHERE l.id = ? && l.user_id=u.id && u.id=m.model_id && 
                  m.model_type='App\\\\Models\\\\LabTechnician'`,
          [lab_list[i].lab_id]
        );
        console.log(image_data);
        if (image_data.length == 0) {
          lab_list[i].image = NO_IMAGE;
        } else if (image_data[0].file_name == "") {
          lab_list[i].image = NO_IMAGE;
        } else {
          lab_list[i].image =
            PROFILE_IMAGE_PATH +
            "/" +
            image_data[0].mediaID +
            "/" +
            image_data[0].file_name;
        }

        var address_data = await db.query(
          `SELECT address1 FROM addresses WHERE owner_id=? && owner_type='App\\\\Models\\\\LabTechnician'`,
          [lab_list[i].lab_id]
        );
        console.log(address_data);

        if (address_data.length == 0) {
          lab_list[i].address = "";
        } else {
          lab_list[i].address = address_data[0].address1;
        }
      }

      res.status(200).json({
        code: 200,
        message: "Lab items retrieved successfully",
        data: lab_list,
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

router.get("/test", function (req, res, next) {
  console.log("*************tests by labId*****************");
  var labId = req.query.labId;

  db.query(
    `SELECT * FROM lab_tests WHERE lab_id = ?`,
    [labId],
    async function (err, results, fields) {
      if (err) {
        console.log(err);
        console.log("Unable to list test in lab :", err);
        res.status(500).json({
          code: 100,
          message: "Unable to list test in lab ",
        });
      } else if (results.length == 0) {
        console.log(results);
        res.status(200).json({
          code: 100,
          message: "No items in lab",
          data: results,
        });
      } else {
        console.log(results);
        var response_data = [];
        for (var j = 0; j < results.length; j++) {
          var data = {};
          data.lab_test_id = results[j].id;
          data.short_description = results[j].short_description;
          data.description = results[j].description;
          data.title = results[j].title;
          data.mrp = results[j].mrp;
          data.price = results[j].price;
          data.ratings = [];

          try {
            var qRes = await db.query(
              `SELECT CONCAT(u.first_name, " ", u.last_name) as patient_name,
        lr.rating, lr.description
        FROM lab_test_ratings as lr, patients as p, users as u
        WHERE lr.lab_test_id=? && lr.patient_id=p.id && p.user_id=u.id`,
              [data.lab_test_id]
            );

            console.log(qRes);

            for (var i = 0; i < qRes.length; i++) {
              data.ratings.push({
                Name: qRes[i].patient_name,
                Rating: qRes[i].rating,
                Description: qRes[i].description,
              });
            }
          } catch (err) {
            console.log(err);
          }

          response_data.push(data);
        }

        res.status(200).json({
          code: 200,
          data: response_data,
        });
      }
    }
  );
});

router.post("/book", function (req, res, next) {
  console.log("*************add to lab test*****************");
  var collectionDateTime = req.body.collectionDateTime;
  var patientId = req.body.patientId;
  var labTestId = req.body.labTestId;
  var transactionId = req.body.transactionId;

  db.query(
    `INSERT INTO book_lab_test (lab_test_id, patient_id, pickup, booked_at) VALUES (?, ?, ?, ?)`,
    [labTestId, patientId, collectionDateTime, getCurrentTime()],
    async function (err, results, fields) {
      if (err) {
        console.log(err);
        console.log("Unable to add to book_lab_test :", err);
        res.status(500).json({
          code: 100,
          message: "Unable to add to book_lab_test ",
        });
      } else if (results.insertId > 0) {
          await db.query(`INSERT INTO transaction_data (orderId, details, tx_status, created_at) VALUES (?, ?, ?, ?)`,
    [transactionId, "Lab Payment", "SUCCESS", getCurrentTime()]);
        console.log("booking Done!");
        res.status(200).json({
          code: 200,
          data: {
            booking_id: results.insertId,
          },
          message: "Successfully booked lab test",
        });
      } else {
        console.log(results);
        res.status(200).json({
          code: 100,
          message: "Unable to book lab test",
        });
      }
    }
  );
});

router.get("/test/history", function (req, res, next) {
  console.log("*************Lab Tests History*****************");
  var patient_id = req.query.patient_id;

  db.query(
    `SELECT bl.id as booking_id, bl.status, bl.booked_at, 
      lt.title as lab_test_name, 
      CONCAT(u.first_name, " ", u.last_name) as lab_name 
      FROM book_lab_test as bl, lab_tests as lt, lab_technicians as ltech, users as u 
      WHERE bl.patient_id=? && bl.lab_test_id=lt.id && lt.lab_id=ltech.id && ltech.user_id=u.id`,
    [patient_id],
    async function (err, results, fields) {
      if (err) {
        console.log(err);
        console.log("Unable to retrieve history :", err);
        res.status(500).json({
          code: 100,
          message: "Unable to retrieve history  ",
        });
      } else if (results.length == 0) {
        console.log(results);
        res.status(200).json({
          code: 100,
          message: "No items in lab history",
          data: results,
        });
      } else {
        console.log(results);
        for (var i = 0; i < results.length; i++) {
          if (results[i].status == 1) {
            try {
              report_image = await db.query(
                `SELECT file_name FROM media WHERE model_id=? && collection_name='book_lab_test'`,
                [results[i].booking_id]
              );
              console.log(i);
              console.log(report_image);
              if (report_image.length != 0) {
                if (report_image[0].file_name == null) {
                  results[i].report = NO_IMAGE;
                } else {
                  results[i].report =
                    REPORT_PATH + "/" + report_image[0].file_name;
                }
              }
            } catch (error) {
              res.status(500).json({
                code: 100,
                message: "Error Occurred ",
              });
              console.log(error);
              throw new Error(error);
            }
          }
        }

        res.status(200).json({
          code: 200,
          message: "cart items retrieved successfully",
          data: results,
        });
      }
    }
  );
});

router.post("/address", function (req, res, next) {
  console.log("*************add to lab test*****************");

  var patient_id = req.body.patient_id;
  var lat = req.body.lat;
  var long = req.body.long;

  db.query(
    `UPDATE addresses SET lat = ?, lng = ?, updated_at = ? WHERE  owner_id = ? && owner_type='App\\\\Models\\\\Patient'`,
    [lat, long, getCurrentTime(), patient_id],
    function (err, results, fields) {
      if (err) {
        console.log(err);
        console.log("Unable to update address :", err);
        res.status(500).json({
          code: 100,
          message: "Unable to update address ",
        });
      } else if (results.affectedRows > 0) {
        console.log(results);
        res.status(200).json({
          code: 200,
          message: "Address updated",
        });
      } else {
        console.log(results);
        res.status(500).json({
          code: 100,
          message: "Address not updated",
        });
      }
    }
  );
});

module.exports = router;
