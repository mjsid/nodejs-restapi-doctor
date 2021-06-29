var express = require("express");
var router = express.Router();
var db = require("../../database");
var { getCurrentTime, getMedicineDetails } = require("../utils");
// const { delete } = require("./banner");

router.get("/", function (req, res, next) {
  console.log("*************Search Wishlist*****************");
  var user_id = req.query.user_id;
  var medicine_id = req.query.medicine_id;

  db.query(
    `SELECT count(id) as total FROM wishlist where user_id = ? && product_id = ?`,
    [parseInt(user_id), parseInt(medicine_id)],
    function (err, results, fields) {
      if (err) {
        console.log(err);
        console.log("Unable to search wishlist :", err);
        res.status(500).json({
          code: 100,
          message: "Unable to search wishlist ",
        });
      } else if (results.length == 0) {
        res.status(200).json({
          code: 100,
          message: "No items in wishlist",
          data: results,
        });
      } else {
        console.log(results);
        res.status(200).json({
          code: 200,
          message: "Wishlist items retrieved successfully",
          data: results,
        });
      }
    }
  );
});

router.get("/list", async function (req, res, next) {
  console.log("*************List Wishlist*****************");
  var user_id = req.query.user_id;
  try {
    var wishlist_data = await db.query(
      `SELECT product_id FROM wishlist where user_id = ? `,
      [parseInt(user_id)]
    );

    if (wishlist_data.length == 0) {
      res.status(200).json({
        code: 100,
        message: "No items in wishlist",
        data: wishlist_data,
      });
    } else {
      console.log(wishlist_data);
      var final_data = [];
      for (var i = 0; i < wishlist_data.length; i++) {
        var medicine_id = wishlist_data[i].product_id;
        console.log(medicine_id);

        var details = {};

        await getMedicineDetails(medicine_id).catch(function (thisValue) {
          details = thisValue;
        });
        details.medicine_id = medicine_id;
        console.log(details);

        switch (details.result) {
          case "successful":
            delete details.result;
            final_data.push(details);
            break;
          case "failed":
            delete details.result;
            console.log("failed to fetch product details");
            break;
          case "empty":
            delete details.result;
            console.log("no details available for this product");
            break;

          default:
            console.log("Unable to get product details");
            break;
        }
      }

      res.status(200).json({
        code: 200,
        message: "Wishlist items listed successfully",
        data: final_data,
      });
    }
  } catch (err) {
    console.log("Unable to list wishlist :", err);
    res.status(500).json({
      code: 100,
      message: "Unable to list wishlist ",
    });
  }
});

router.post("/addRemove", function (req, res, next) {
  console.log("*************add to Wishlist*****************");
  var userId = req.body.user_id;
  var productId = req.body.medicine_id;
  var isWishlist = parseInt(req.body.is_wishlist);

  if (isWishlist == 1) {
    db.query(
      `INSERT INTO wishlist (user_id, product_id, created_date) VALUES (?, ?, ?)`,
      [userId, productId, getCurrentTime()],
      function (err, results, fields) {
        if (err) {
          console.log(err);
          console.log("Unable to add to wishlist :", err);
          res.status(500).json({
            code: 100,
            message: "Unable to add to wishlist ",
          });
        } else if (results.affectedRows > 0) {
          console.log(results);
          res.status(200).json({
            code: 200,
            message: "item added to wishlist successfully",
          });
        } else {
          console.log(results);
          res.status(200).json({
            code: 100,
            message: "Error in adding value to wishlist",
          });
        }
      }
    );
  } else if (isWishlist == 0) {
    db.query(
      `DELETE FROM wishlist 
      WHERE user_id = ? && product_id = ?`,
      [userId, productId],
      function (err, results, fields) {
        if (err) {
          console.log(err);
          console.log("Unable to delete from wishlist :", err);
          res.status(500).json({
            code: 100,
            message: "Unable to delete from wishlist ",
          });
        } else if (results.affectedRows > 0) {
          console.log(results);
          res.status(200).json({
            code: 200,
            message: "item deleted from wishlist successfully",
          });
        } else {
          console.log(results);
          res.status(200).json({
            code: 100,
            message: "Error in deleting value from wishlist",
          });
        }
      }
    );
  } else {
    res.status(200).json({
      code: 100,
      message: "Please provide valid is_wishlist value",
    });
  }
});

module.exports = router;
