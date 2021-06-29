var express = require("express");
var router = express.Router();
var db = require("../../database");
var { getCurrentTime } = require("../utils");
// const { delete } = require("./medicine");

const MEDICINE_IMAGE_PATH = "http://dotrx.in/public/images/medicines/";
const NO_IMAGE = "http://dotrx.in/images/no-image.png";

router.get("/", function (req, res, next) {
  console.log("*************cart*****************");
  var user_id = req.query.patient_id;
  var medicine_id = req.query.medicine_id;

  db.query(
    `SELECT quantity FROM cart 
    where user_id = ? && product_id = ?`,
    [parseInt(user_id), parseInt(medicine_id)],
    function (err, results, fields) {
      if (err) {
        console.log(err);
        console.log("Unable to search cart :", err);
        res.status(500).json({
          code: 100,
          message: "Unable to search cart ",
        });
      } else if (results.length == 0) {
        res.status(200).json({
          code: 100,
          message: "No items in cart",
          data: results,
        });
      } else {
        console.log(results);
        res.status(200).json({
          code: 200,
          message: "cart items retrieved successfully",
          data: results,
        });
      }
    }
  );
});

router.post("/add", async function (req, res, next) {
  console.log("*************add to cart*****************");
  console.log(req.body);
  var user_id = req.body.patient_id;
  var medicine_id = req.body.medicine_id;
  var quantity = req.body.quantity;

  try {
    response = await db.query(
      `SELECT quantity FROM cart  where user_id = ? && product_id = ?`,
      [parseInt(user_id), parseInt(medicine_id)]
    );
    if (response.length == 0) {
      db.query(
        `INSERT INTO cart (user_id, product_id, quantity, added_date) VALUES (?, ?, ?, ?)`,
        [parseInt(user_id), parseInt(medicine_id), quantity, getCurrentTime()],
        function (err, results, fields) {
          if (err) {
            console.log(err);
            console.log("Unable to add to cart :", err);
            res.status(500).json({
              code: 100,
              message: "Unable to add to cart ",
            });
          } else {
            console.log(results);
            res.status(200).json({
              code: 200,
              message: "item added to cart successfully",
            });
          }
        }
      );
    } else {
      const response_quantity = response[0].quantity;
      var total_quantity = response_quantity + quantity;
      db.query(
        "UPDATE `cart` SET `quantity`=?, `added_date`=? WHERE user_id=? && product_id=?",
        [
          total_quantity,
          getCurrentTime(),
          parseInt(user_id),
          parseInt(medicine_id),
        ],
        function (err, results, fields) {
          if (err) {
            console.log(err);
            console.log("Unable to add to cart :", err);
            res.status(500).json({
              code: 100,
              message: "Unable to add to cart ",
            });
          } else {
            console.log(results);
            res.status(200).json({
              code: 200,
              message: "item added to cart successfully",
            });
          }
        }
      );
    }
  } catch (err) {
    console.log("Unable to fetch cart item ", err);
  }
});

router.post("/edit", function (req, res, next) {
  console.log("************* Edit cart*****************");
  var user_id = req.query.patient_id;
  var medicine_id = req.query.medicine_id;
  var quantity = req.query.quantity;
  console.log(req.query);

  db.query(
    `UPDATE cart SET quantity = ? WHERE  user_id = ?  &&  product_id = ?`,
    [quantity, user_id, medicine_id],
    function (err, results, fields) {
      if (err) {
        console.log(err);
        console.log("Unable to edit cart :", err);
        res.status(500).json({
          code: 100,
          message: "Unable to edit cart ",
        });
      } else if (results.affectedRows > 0) {
        console.log(results);
        res.status(200).json({
          code: 200,
          message: "cart edited successfully",
        });
      } else {
        console.log(results);
        res.status(200).json({
          code: 100,
          message: "item was not updated",
        });
      }
    }
  );
});

router.post("/delete", function (req, res, next) {
  console.log("************* Delete cart*****************");
  var user_id = req.query.patient_id;
  var medicine_id = req.query.medicine_id;

  db.query(
    `DELETE FROM cart  WHERE  user_id = ?  &&  product_id = ?`,
    [user_id, medicine_id],
    function (err, results, fields) {
      if (err) {
        console.log(err);
        console.log("Unable to delete item from cart :", err);
        res.status(500).json({
          code: 100,
          message: "Unable to delete item from cart ",
        });
      } else if (results.affectedRows > 0) {
        console.log(results);
        res.status(200).json({
          code: 100,
          message: "item deleted successfully",
        });
      } else {
        console.log(results);
        res.status(200).json({
          code: 100,
          message: "item was not deleted",
        });
      }
    }
  );
});

router.get("/list", function (req, res, next) {
  console.log("*************list cart*****************");
  var patient_id = req.query.patient_id;

  db.query(
    `SELECT c.id as cart_id, m.id as medicine_id, m.name as title, m.image, m.unit_details,
    c.quantity, m.buying_price as mrp, m.selling_price as sell_price, m.prescription_required 
    FROM cart as c, medicines as m 
    WHERE c.user_id = ? && c.product_id = m.id`,
    [patient_id],
    function (err, results, fields) {
      if (err) {
        console.log(err);
        console.log("Unable to search cart :", err);
        res.status(500).json({
          code: 100,
          message: "Unable to search cart ",
        });
      } else if (results.length == 0) {
        res.status(200).json({
          code: 100,
          message: "No items in cart",
          data: results,
        });
      } else {
        console.log(results);
        for (var i = 0; i < results.length; i++) {
          if (results[i].image == null) {
            results[i].image = NO_IMAGE;
          } else {
            results[i].image = MEDICINE_IMAGE_PATH + "/" + results[i].image;
          }
          if (results[i].prescription_required == "0") {
            results[i].prescription_required = false;
          } else if (results[i].prescription_required == "1") {
            results[i].prescription_required = true;
          } else {
            results[i].prescription_required = "";
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

router.get("/alsobought", function (req, res, next) {
  console.log("*************Also bought*****************");
  var patient_id = req.query.patient_id;

  db.query(
    `SELECT mr.medicine_id, m.name, m.image, m.unit_details, m.selling_price as price, m.buying_price as mrp, m.sale
  FROM medicine_ratings as mr, medicines as m 
  WHERE mr.status= ? && m.id = mr.medicine_id 
  GROUP BY mr.medicine_id HAVING AVG(mr.rating) >= 4`,
    [1],
    function (err, results, fields) {
      if (err) {
        console.log(err);
        console.log("Unable to list top products :", err);
        res.status(500).json({
          code: 100,
          message: "Unable to list top products ",
        });
      } else if (results.length == 0) {
        res.status(200).json({
          code: 100,
          message: "No top rated products available",
        });
      } else {
        console.log(results);

        db.query(
          `SELECT m.id as medicine_id   
          FROM cart as c, medicines as m 
          WHERE c.user_id = ? && c.product_id = m.id`,
          [patient_id],
          function (err, results2, fields) {
            if (err) {
              console.log(err);
              console.log("Unable to list cart items :", err);
              res.status(500).json({
                code: 100,
                message: "Unable to list cart items ",
              });
            } else if (results2.length == 0) {
              console.log(results2);
              res.status(200).json({
                code: 100,
                message: "No top rated products available",
              });
            } else {
              console.log(results2);

              for (var i = results.length - 1; i >= 0; i--) {
                if (results[i].image == null) {
                  results[i].image = NO_IMAGE;
                } else {
                  results[i].image =
                    MEDICINE_IMAGE_PATH + "/" + results[i].image;
                }
                for (var j = 0; j < results2.length; j++) {
                  if (results2[j].medicine_id == results[i].medicine_id) {
                    results.splice(i, 1);
                    break;
                  }
                }
              }
              if (results.length == 0) {
                res.status(200).json({
                  code: 100,
                  message: "No suggestions available",
                });
              } else {
                res.status(200).json({
                  code: 200,
                  message: "cart items retrieved successfully",
                  data: results,
                });
              }
            }
          }
        );
      }
    }
  );
});

router.get("/discount", function (req, res, next) {
  console.log("************* cart  discount*****************");
  var coupon = req.query.coupon;
  var patient_id = req.query.patient_id;
  var total_amount = 0;

  db.query(
    `SELECT c.quantity, m.selling_price   
    FROM cart as c, medicines as m 
    WHERE c.user_id = ? && c.product_id = m.id`,
    [patient_id],
    function (err, results, fields) {
      if (err) {
        console.log(err);
        console.log("Unable to search cart :", err);
        res.status(500).json({
          code: 100,
          message: "Unable to search cart ",
        });
      } else if (results.length == 0) {
        res.status(200).json({
          code: 100,
          message: "No items in cart",
          discount_price: 0,
        });
      } else {
        console.log(results);
        for (var i = 0; i < results.length; i++) {
          total_amount += results[i].quantity * results[i].selling_price;
        }

        db.query(
          `SELECT end_date, cart_value, amount, type 
            FROM coupon
            WHERE coupon_code = ?`,
          [coupon],
          function (err, results, fields) {
            if (err) {
              console.log(err);
              console.log("Unable to search coupon :", err);
              res.status(500).json({
                code: 100,
                message: "Unable to search coupon ",
              });
            } else if (results.length == 0) {
              res.status(200).json({
                code: 100,
                message: "No coupon found",
                discount_price: 0,
              });
            } else {
              console.log(results);
              results[0].end_date = results[0].end_date
                .toISOString()
                .replace("T", " ")
                .substr(0, 19);
              console.log(getCurrentTime());
              console.log(results[0].end_date);
              if (getCurrentTime() < results[0].end_date) {
                if (results[0].type == "percentage") {
                  if (total_amount >= results[0].cart_value) {
                    var discount = (total_amount * results[0].amount) / 100;
                    var price = total_amount - discount;
                    res.status(200).json({
                      code: 200,
                      message: "Coupon applied successfully",
                      discount_price: price.toFixed(2),
                    });
                  } else {
                    res.status(200).json({
                      code: 100,
                      message:
                        "Cart amount is not sufficient to apply this coupon",
                      discount_price: 0,
                    });
                  }
                } else {
                  res.status(200).json({
                    code: 100,
                    message: "Coupon type is incorrect",
                    discount_price: 0,
                  });
                }
              } else {
                res.status(200).json({
                  code: 100,
                  message: "Coupon has Expired",
                  discount_price: 0,
                });
              }
            }
          }
        );
      }
    }
  );
});

module.exports = router;
