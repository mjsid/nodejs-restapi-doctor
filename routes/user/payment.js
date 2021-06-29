var express = require("express");
var router = express.Router();
var db = require("../../database");
var { getCurrentTime } = require("../utils");
const axios = require("axios");
const request = require("request");

// const ENDPOINT = "https://test.cashfree.com/api/v2/cftoken/order";
// const APP_ID = "41323e449b9e22b6d1fceacd732314";
// const APP_SECRET_KEY = "4db3a031b049a85c699f8542996087366c544a84";

const ENDPOINT = "https://api.cashfree.com/api/v2/cftoken/order";
const APP_ID = "86339f8c7b8c55b2bd1c5559b93368";
const APP_SECRET_KEY = "66f554b9b4d48ee2930ed4abd8374347b1e64f6c";

const ORDER_URL = "http://dotrx.in/assign-pharmacist?orderid=";

router.post("/token", async (req, res, next) => {
  console.log("**********TOKEN GENERATION API****************");
  console.log(req.body);

  var orderId = req.body.orderId;
  var orderAmount = req.body.orderAmount;
  var orderCurrency = req.body.orderCurrency;

  var data = {
    orderId: orderId,
    orderAmount: orderAmount,
    orderCurrency: orderCurrency,
  };

  var headers = {
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length,
      "X-Client-Id": APP_ID,
      "X-Client-Secret": APP_SECRET_KEY,
    },
  };
  console.log(ENDPOINT);
  try {
    var response = await axios.post(ENDPOINT, data, headers);
    console.log(response);
    res.status(200).json({
      code: 200,
      data: response.data,
    });
  } catch (error) {
    console.log("ERROR : ", error);
    res.status(400).json({
      code: 100,
      message: "Unable to fetch token",
    });
  }

  console.log("Hello");
});

router.post("/success", function (req, res, next) {
  var orderId = req.body.orderId;
  var patientId = req.body.patientId;
  var transactionId = req.body.transactionId;
  var url = ORDER_URL + orderId;

  request(url, async function (err, results, body) {
    if (err) {
      console.log("Error in payment success : ", err);
      res.status(500).json({
        code: 100,
        message: "Error in payment success",
      });
    } else {
      console.log(results.body);
      await db.query(`DELETE FROM cart WHERE user_id = ?`, [patientId]);
      await db.query(
        `INSERT INTO transaction_data (orderId, details, tx_status, created_at) VALUES (?, ?, ?, ?)`,
        [transactionId, "Medicine Payment", "SUCCESS", getCurrentTime()]
      );
      await db.query(
        `UPDATE orders SET order_status = ?, payment_status = ? WHERE id = ?`,
        [pending, 1, orderId]
      );
      res.status(200).json({
        code: 200,
        message: JSON.parse(results.body),
      });
    }
  });
});

router.post("/doctor_success", function (req, res, next) {
  var appointmentId = req.body.appointmentId;
  var transactionId = req.body.transactionId;

  db.query(
    `UPDATE appointments SET status= ? , updated_at = ? WHERE id = ?`,
    [4, getCurrentTime(), appointmentId],
    async function (err, results, body) {
      if (err) {
        console.log("Error in doctor payment success : ", err);
        res.status(500).json({
          code: 100,
          message: "Error in doctor payment success",
        });
      } else if (results.affectedRows > 0) {
        await db.query(
          `INSERT INTO transaction_data (orderId, details, tx_status, created_at) VALUES (?, ?, ?, ?)`,
          [transactionId, "Doctor Payment", "SUCCESS", getCurrentTime()]
        );
        console.log(results);
        res.status(200).json({
          code: 200,
          message: "Doctor payment Successful",
        });
      } else {
        console.log(results);
        res.status(200).json({
          code: 100,
          message: "Doctor payment Unsuccessful",
        });
      }
    }
  );
});

router.post("/ambulance_success", function (req, res, next) {
  var ambulanceCallsId = req.body.ambulanceCallsId;
  var transactionId = req.body.transactionId;

  db.query(
    `UPDATE ambulance_calls SET status= ? , updated_at = ? WHERE id = ?`,
    [4, getCurrentTime(), ambulanceCallsId],
    async function (err, results, body) {
      if (err) {
        console.log("Error in Ambulance payment success : ", err);
        res.status(500).json({
          code: 100,
          message: "Error in Ambulance payment success",
        });
      } else if (results.affectedRows > 0) {
        await db.query(
          `INSERT INTO transaction_data (orderId, details, tx_status, created_at) VALUES (?, ?, ?, ?)`,
          [transactionId, "Ambulance Payment", "SUCCESS", getCurrentTime()]
        );
        console.log(results);
        res.status(200).json({
          code: 200,
          message: "Ambulance payment Successful",
        });
      } else {
        console.log(results);
        res.status(200).json({
          code: 100,
          message: "Ambulance payment Unsuccessful",
        });
      }
    }
  );
});

module.exports = router;
