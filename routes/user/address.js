var express = require("express");
var router = express.Router();
var db = require("../../database");

var { getCurrentTime } = require("../utils");

router.get("/all", (req, res, next) => {
  console.log("***************Get All Address API*********************");

  var owner_id = req.query.owner_id;
  var owner_type = req.query.owner_type || "App\\Models\\Patient";

  if (!owner_id || !owner_type) {
    res.status(200).json({
      code: 100,
      message: "owner_id and owner_type are required parameters",
    });
  } else {
    db.query(
      `SELECT * FROM addresses WHERE owner_id = ? && owner_type = ?`,
      [owner_id, owner_type],
      function (err, results, fields) {
        if (err) {
          console.log("Unable to get addresses : ", err);
          res.status(500).json({
            code: 100,
            message: "Unable to get addresses",
          });
        } else if (results.length > 0) {
          console.log(results);
          var data = results;
          for (var i = 0; i < data.length; i++) {
            data[i].full_name = results[i].full_name || "";
            data[i].phone = results[i].phone || "";
            data[i].address1 = results[i].address1 || "";
            data[i].lat = results[i].lat || "";
            data[i].lat = data[i].lat.toString();
            data[i].lng = results[i].lng || "";
            data[i].lng = data[i].lng.toString();
            data[i].city = results[i].city || "";
            data[i].address2 = results[i].address2 || "";
            data[i].state = results[i].state || "";
            data[i].zip = results[i].zip || "";
            data[i].type = results[i].type || "";
          }
          res.status(200).json({
            code: 200,
            data: data,
          });
        } else {
          console.log(results);
          res.status(200).json({
            code: 100,
            message: "Address not found",
          });
        }
      }
    );
  }
});

router.post("/add", (req, res, next) => {
  console.log("***************Add Address API*********************");

  var owner_id = req.body.owner_id;
  var owner_type = req.body.owner_type || "App\\Models\\Patient";
  var full_name = req.body.full_name || "";
  var phone = req.body.phone || "";
  var address1 = req.body.address1 || "";
  var lat = req.body.lat || "";
  var lng = req.body.lng || "";
  var address2 = req.body.address2 || "";
  var city = req.body.city || "";
  var state = req.body.state || "";
  var zip = req.body.zip || "";
  var type = req.body.type || "";

  if (!owner_id || !owner_type) {
    res.status(200).json({
      code: 100,
      message: "owner_id and owner_type are required parameters",
    });
  } else {
    db.query(
      `INSERT INTO addresses (owner_id, owner_type, full_name, phone, 
        address1, lat, lng, address2, city, state, zip, type, created_at, updated_at
        ) VALUES(? ,? ,? ,? ,? ,? ,? ,? ,? ,? ,? ,? ,? ,?)`,
      [
        parseInt(owner_id),
        owner_type,
        full_name,
        phone,
        address1,
        parseFloat(lat),
        parseFloat(lng),
        address2,
        city,
        state,
        zip,
        parseInt(type),
        getCurrentTime(),
        getCurrentTime(),
      ],
      function (err, results, fields) {
        if (err) {
          console.log("Unable to add addresses : ", err);
          res.status(500).json({
            code: 100,
            message: "Unable to add addresses",
          });
        } else if (results.insertId > 0) {
          console.log(results);
          var address_id = results.insertId;
          res.status(200).json({
            code: 200,
            message: "Address added successfully",
            data: { address_id: address_id },
          });
        } else {
          console.log(results);
          res.status(200).json({
            code: 100,
            message: "Address addition failed",
          });
        }
      }
    );
  }
});

router.post("/delete", (req, res, next) => {
  console.log("***************Delete Address API*********************");

  var address_id = req.body.address_id;

  if (!address_id) {
    res.status(200).json({
      code: 100,
      message: "address_id is required parameter",
    });
  } else {
    db.query(
      `DELETE FROM addresses where id = ?`,
      [address_id],
      function (err, results, fields) {
        if (err) {
          console.log("Unable to delete addresses : ", err);
          res.status(500).json({
            code: 100,
            message: "Unable to delete addresses",
          });
        } else if (results.affectedRows > 0) {
          console.log(results);

          res.status(200).json({
            code: 200,
            message: "Address deleted successfully",
          });
        } else {
          console.log(results);
          res.status(200).json({
            code: 100,
            message: "Address not found",
          });
        }
      }
    );
  }
});

router.post("/edit", (req, res, next) => {
  console.log("***************Add Address API*********************");

  var address_id = req.body.address_id;
  var full_name = req.body.full_name || "";
  var phone = req.body.phone || "";
  var address1 = req.body.address1 || "";
  var lat = req.body.lat || "";
  var lng = req.body.lng || "";
  var address2 = req.body.address2 || "";
  var city = req.body.city || "";
  var state = req.body.state || "";
  var zip = req.body.zip || "";
  var type = req.body.type || "";

  if (!address_id) {
    res.status(200).json({
      code: 100,
      message: "address_id is required parameter",
    });
  } else {
    db.query(
      `UPDATE addresses SET full_name = ?, phone = ?, address1 = ?, 
      lat = ?, lng = ?, address2 = ?, city = ?, state = ?, zip = ?, type = ?,
      updated_at = ?
      WHERE  id = ?`,
      [
        full_name,
        phone,
        address1,
        parseFloat(lat),
        parseFloat(lng),
        address2,
        city,
        state,
        zip,
        parseInt(type),
        getCurrentTime(),
        address_id,
      ],
      function (err, results, fields) {
        if (err) {
          console.log("Unable to edit addresses : ", err);
          res.status(500).json({
            code: 100,
            message: "Unable to edit addresses",
          });
        } else if (results.affectedRows > 0) {
          console.log(results);
          res.status(200).json({
            code: 200,
            message: "Address edited successfully",
          });
        } else {
          console.log(results);
          res.status(200).json({
            code: 100,
            message: "Address not found",
          });
        }
      }
    );
  }
});

module.exports = router;
