var express = require("express");
var db = require("../../database");
var router = express.Router();

var { getCurrentTime } = require("../utils");

var request = require("request");
const { promisify } = require("util");
// const { Json } = require("sequelize/types/lib/utils");
request = promisify(request);

const ORDER_URL = "http://dotrx.in/assign-pharmacist?orderid=";

router.post("/submit", function (req, res, next) {
  console.log("*************submit order*****************");
  console.log(req.body);
  //   var cart_id = new Array(req.body.cart_id);
  var patient_id = req.body.patient_id;
  var address = req.body.address;
  var name = req.body.name;
  var city = req.body.city;
  var zip = req.body.zip;
  var total_price = req.body.total_price;
  var total_products_mrp = req.body.total_products_mrp;
  var payment_method = req.body.payment_method;
  var coupon_id = req.body.coupon_id;
  var coupon_discount = req.body.coupon_discount;
  var prescription = req.body.prescription || "";

  db.query(
    `SELECT c.id as cart_id, m.name as product_name, 
        c.quantity, m.selling_price, m.buying_price as mrp     
        FROM cart as c, medicines as m 
        WHERE c.user_id = ? && c.product_id = m.id`,
    [patient_id],
    async function (err, results, fields) {
      if (err) {
        console.log(err);
        console.log("Unable to add to orders :", err);
        res.status(500).json({
          code: 100,
          message: "Unable to add to orders ",
        });
      } else if (results.length == 0) {
        console.log(results);
        res.status(200).json({
          code: 100,
          message: "No products available for this patient in cart",
        });
      } else {
        console.log(results);
        try {
          var order_data = await db.query(
            `INSERT INTO orders (patient_id, address, name, city, zip, total_price,
                    total_products_mrp, payment_method, coupon_id, coupon_discount, 
                    payment_status, prescription, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              patient_id,
              address,
              name,
              city,
              zip,
              total_price,
              total_products_mrp,
              payment_method,
              coupon_id,
              coupon_discount,
              0,
              prescription,
              getCurrentTime(),
            ]
          );
          var order_id = order_data.insertId;

          for (var i = 0; i < results.length; i++) {
            await db.query(
              `INSERT INTO order_details (order_id, product_name, quantity,
                selling_price, mrp, created_at, updated_at)  
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                order_id,
                results[i].product_name,
                results[i].quantity,
                results[i].selling_price,
                results[i].mrp,
                getCurrentTime(),
                getCurrentTime(),
              ]
            );
          }
          console.log(order_id);

          if (payment_method.toUpperCase() == "COD") {
            await db.query(`DELETE FROM cart WHERE user_id = ?`, [patient_id]);
            var url = ORDER_URL + order_id;

            var results = await request(url);
            console.log(results);

            var results_body = JSON.parse(results.body);
            console.log(results_body);
            res.status(200).json({
              code: 200,
              message: results_body.message,
              data: { order_id: order_id },
            });
          } else if (payment_method.toUpperCase() == "ONLINE") {
            console.log(`inside online ${payment_method}`);
            var orderData = await db.query(
              `UPDATE orders SET order_status = ? WHERE id = ?`,
              ["payment_initiated", order_id]
            );
            console.log(orderData);
            res.status(200).json({
              code: 200,
              message: "Order submitted successfully",
              data: { order_id: order_id },
            });
          } else {
            res.status(200).json({
              code: 200,
              message: "Order submitted successfully",
              data: { order_id: order_id },
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
      }
    }
  );
});

router.get("/list", function (req, res, next) {
  console.log("*************list order*****************");
  var patient_id = req.query.patient_id;

  db.query(
    `SELECT id, name, address, city, zip, total_price, 
    total_products_mrp, payment_method, order_date, 
    order_status, coupon_discount, payment_status, updated_at   
      FROM orders
      WHERE patient_id = ? 
      ORDER BY id DESC`,
    [patient_id],
    async function (err, results, fields) {
      if (err) {
        console.log(err);
        console.log("Unable to search order :", err);
        res.status(500).json({
          code: 100,
          message: "Unable to search order ",
        });
      } else if (results.length == 0) {
        res.status(200).json({
          code: 100,
          message: "No items in order",
        });
      } else {
        console.log(results);
        try {
          var order_data = results;
          for (var i = 0; i < order_data.length; i++) {
            order_data[i].details = await db.query(
              `SELECT od.pharmacist_id, od.dboy_id, m.id as medicine_id, od.product_name, 
            od.quantity, od.selling_price, od.mrp, od.cancelling_reason, 
            od.delivery_date, od.status   
              FROM  order_details as od, medicines as m
              WHERE od.order_id = ? && m.name = od.product_name`,
              [order_data[i].id]
            );
            console.log(order_data[i].details);

            for (var j = 0; j < order_data[i].details.length; j++) {
              var pharmacist_name = await db.query(
                `SELECT CONCAT(first_name, " ", last_name)  as name
                FROM users
                WHERE id = ?`,
                [order_data[i].details[j].pharmacist_id]
              );
              console.log(pharmacist_name);
              if (pharmacist_name.length == 0) {
                order_data[i].details[j].pharmacist_name = "";
              } else {
                order_data[i].details[j].pharmacist_name =
                  pharmacist_name[0].name;
              }
              delete order_data[i].details[j].pharmacist_id;

              var delivery_boy_name = await db.query(
                `SELECT CONCAT(first_name, " ", last_name)  as name
                  FROM users
                  WHERE id = ?`,
                [order_data[i].details[j].dboy_id]
              );
              console.log(delivery_boy_name);
              if (delivery_boy_name.length == 0) {
                order_data[i].details[j].delivery_boy_name = "";
              } else {
                order_data[i].details[j].delivery_boy_name =
                  delivery_boy_name[0].name;
              }
              delete order_data[i].details[j].dboy_id;
            }
            if (order_data[i].order_status == "ready_to_dispatch") {
              order_data[i].order_status = "Ready to Dispatch";
            }
          }

          res.status(200).json({
            code: 200,
            message: "order items retrieved successfully",
            data: order_data,
          });
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
  );
});

router.post("/refill", function (req, res, next) {
  console.log("*************refill order*****************");
  console.log(req.body);

  var patient_id = req.body.patient_id;
  var order_id = req.body.order_id;

  db.query(
    `SELECT product_name, quantity
        FROM order_details 
        WHERE order_id = ?`,
    [order_id],
    async function (err, results, fields) {
      if (err) {
        console.log(err);
        console.log("Unable to list orders :", err);
        res.status(500).json({
          code: 100,
          message: "Unable to list orders",
        });
      } else if (results.length == 0) {
        console.log(results);
        res.status(200).json({
          code: 100,
          message: "No entries for this user in orders",
        });
      } else {
        console.log(results);
        try {
          var refill_data = results;
          for (var i = 0; i < refill_data.length; i++) {
            var product_id = await db.query(
              `SELECT id FROM medicines where name = ?`,
              [refill_data[i].product_name]
            );
            if (product_id.length == 0) {
              continue;
            } else {
              await db.query(
                `INSERT INTO cart (user_id, product_id, quantity, added_date) 
              VALUES (?, ?, ?, ?)`,
                [
                  patient_id,
                  product_id[0].id,
                  refill_data[i].quantity,
                  getCurrentTime(),
                ]
              );
            }
          }

          res.status(200).json({
            code: 200,
            message: "Order refilled successfully",
          });
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
  );
});

router.get("/deliverable", function (req, res, next) {
  console.log("*************deliverable order*****************");
  var zip_code = req.query.zip_code;

  db.query(
    `SELECT * FROM mst_pincode
      WHERE pincode = ? && is_active = ?`,
    [zip_code, 1],
    function (err, results, fields) {
      if (err) {
        console.log(err);
        console.log("Unable to search pincode :", err);
        res.status(500).json({
          code: 100,
          message: "Unable to search pincode ",
        });
      } else if (results.length == 0) {
        console.log(results);
        res.status(200).json({
          code: 100,
          message: "Order is not deliverable at this pincode",
        });
      } else {
        console.log(results);
        res.status(200).json({
          code: 200,
          message: "Order is deliverable at this pincode",
        });
      }
    }
  );
});

module.exports = router;
