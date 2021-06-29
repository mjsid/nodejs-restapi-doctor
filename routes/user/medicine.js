var express = require("express");
var db = require("../../database");
var { getRatings, getMedicineDetails, getWishlistStatus } = require("../utils");
var router = express.Router();

const env = process.env.NODE_ENV || "development";
var config = require("../../config/config.json")[env];

router.get("/details", async function (req, res, next) {
  console.log("*******************Medicine details*****************");
  var medicine_id = req.query.medicine_id;

  var user_id = req.query.user_id;

  if (user_id) {
    var user_wishlist = (await getWishlistStatus(user_id)) || [];
  }

  getMedicineDetails(medicine_id, function (details) {
    switch (details.result) {
      case "successful":
        delete details.result;
        if (user_id) {
          if (user_wishlist.includes(parseInt(medicine_id))) {
            details.wishlist_status = true;
          } else {
            details.wishlist_status = false;
          }
        }
        details.side_effects = "";
        details.salt_composition = "";
        res.status(200).json({
          code: 200,
          data: details,
        });
        break;
      case "failed":
        delete details.result;
        res.status(500).json({
          code: 100,
          message: "Error in getting medicine details",
        });
        break;
      case "empty":
        delete details.result;
        res.status(500).json({
          code: 100,
          message: "Unable to get medicine details",
        });
        break;

      default:
        res.status(500).json({
          code: 100,
          message: "Unable to get details",
        });
        break;
    }
  });
});

router.get("/category", function (req, res, next) {
  console.log("*******Medicine By Category Id************");
  var category_id = req.query.id;
  var start = req.query.start;
  var end = req.query.end;
  var total_count = null;

  db.query(
    `SELECT id as medicine_id, name, selling_price, buying_price, image, sale, is_active FROM 
     medicines WHERE category_id=? order by id desc limit ?, ?`,
    [category_id, parseInt(start), parseInt(end)],
    async function (err, results, fields) {
      if (err) {
        console.log("Unable to find medicines : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to fetch medicines",
        });
      } else {
        var data = results;
        for (var i = 0; i < data.length; i++) {
          var img = data[i].image;
          if (img) {
            data[i].image = config.medicine_image + "/" + img;
          } else {
            data[i].image = "http://dotrx.in/images/no-image.png";
          }
          var ratings = await getRatings(data[i].medicine_id);
          data[i].total_ratings = ratings.total_ratings;
          data[i].average_star_rating = ratings.average_star_rating;
        }
        db.query(
          `SELECT count(id) as total_items FROM medicines WHERE category_id=?`,
          [category_id],
          function (err, results, fields) {
            if (err) {
              console.log("Unable to get total items : ", err);
              total_count = null;
            } else {
              if (results.length > 0) {
                console.log(results);
                console.log(data);
                total_items = results[0].total_items;
              } else {
                total_items = null;
              }
            }
            console.log(data);
            res.status(200).json({
              code: 200,
              data: { total_items: total_items, results: data },
            });
          }
        );
      }
    }
  );
});

router.get("/brand", function (req, res, next) {
  console.log("*******Medicine By brand Id************");
  var brand_id = req.query.brand_id;
  var start = req.query.start;
  var end = req.query.end;

  db.query(
    `SELECT id as medicine_id, name, selling_price, buying_price, image, sale, is_active FROM 
       medicines WHERE brand_id=? order by id desc limit ?, ?`,
    [brand_id, parseInt(start), parseInt(end)],
    async function (err, results, fields) {
      if (err) {
        console.log("Unable to find medicines by brand : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to fetch medicines by brand",
        });
      } else {
        var data = results;
        console.log(data);
        for (var i = 0; i < data.length; i++) {
          var img = data[i].image;
          if (img) {
            data[i].image = config.medicine_image + "/" + img;
          } else {
            data[i].image = "http://dotrx.in/images/no-image.png";
          }
          var ratings = await getRatings(data[i].medicine_id);
          console.log(ratings);
          data[i].total_ratings = ratings.total_ratings;
          data[i].average_star_rating = ratings.average_star_rating;
        }
        db.query(
          `SELECT count(id) as total_items FROM medicines WHERE brand_id=?`,
          [brand_id],
          function (err, results, fields) {
            if (err) {
              console.log("Unable to get total items : ", err);
              total_count = null;
            } else {
              if (results.length > 0) {
                console.log(results);
                console.log(data);
                total_items = results[0].total_items;
              } else {
                total_items = null;
              }
            }
            console.log(data);
            res.status(200).json({
              code: 200,
              data: {
                total_items: total_items,
                results: data,
              },
            });
          }
        );
      }
    }
  );
});

router.get("/new", async function (req, res, next) {
  console.log("*******New medicines************");
  var user_id = req.query.user_id;

  if (user_id) {
    var user_wishlist = (await getWishlistStatus(user_id)) || [];
  }

  db.query(
    `SELECT id as medicine_id, name, selling_price, buying_price, image, sale,
    is_active FROM 
         medicines order by id DESC LIMIT 50`,
    [],
    async function (err, results, fields) {
      if (err) {
        console.log("Unable to find new medicines : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to fetch new medicines",
        });
      } else {
        var data = results;
        for (var i = 0; i < data.length; i++) {
          var img = data[i].image;
          if (img) {
            data[i].image = config.medicine_image + "/" + img;
          } else {
            data[i].image = "http://dotrx.in/images/no-image.png";
          }
          var ratings = await getRatings(data[i].medicine_id);
          data[i].total_ratings = ratings.total_ratings;
          data[i].average_star_rating = ratings.average_star_rating;

          if (user_id) {
            if (user_wishlist.includes(data[i].medicine_id)) {
              data[i].wishlist_status = true;
            } else {
              data[i].wishlist_status = false;
            }
          }
        }

        res.status(200).json({
          code: 200,
          data: data,
        });
      }
    }
  );
});

router.get("/deals", async function (req, res, next) {
  console.log("*******Hot deals************");
  var user_id = req.query.user_id;

  if (user_id) {
    var user_wishlist = (await getWishlistStatus(user_id)) || [];
  }

  db.query(
    `SELECT id as medicine_id, name, selling_price, buying_price, image, sale, is_active FROM 
           medicines WHERE sale=? order by id DESC LIMIT 50`,
    [1],
    async function (err, results, fields) {
      if (err) {
        console.log("Unable to find hot deals : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to fetch hot deals",
        });
      } else {
        var data = results;
        for (var i = 0; i < data.length; i++) {
          var img = data[i].image;
          if (img) {
            data[i].image = config.medicine_image + "/" + img;
          } else {
            data[i].image = "http://dotrx.in/images/no-image.png";
          }
          var ratings = await getRatings(data[i].medicine_id);
          data[i].total_ratings = ratings.total_ratings;
          data[i].average_star_rating = ratings.average_star_rating;

          if (user_id) {
            if (user_wishlist.includes(data[i].medicine_id)) {
              data[i].wishlist_status = true;
            } else {
              data[i].wishlist_status = false;
            }
          }
        }

        res.status(200).json({
          code: 200,
          data: data,
        });
      }
    }
  );
});

router.get("/ratings", function (req, res, next) {
  console.log("**ratings*****");
  var medicine_id = req.query.medicine_id;

  db.query(
    `SELECT COUNT(rating) as total_ratings,  AVG(rating) as average_star_rating FROM 
             medicine_ratings WHERE medicine_id=? && status=?`,
    [medicine_id, 1],
    function (err, results, fields) {
      if (err) {
        console.log("Unable to find hot deals : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to fetch hot deals",
        });
      } else {
        console.log(results);
        var data = results[0];
        var total_ratings = data.total_ratings;
        var average_star_rating = data.average_star_rating;
        // var average_star_rating = (total_star_ratings * 1.0) / total_ratings;
        res.status(200).json({
          code: 200,
          data: {
            total_ratings,
            average_star_rating,
          },
        });
      }
    }
  );
});

router.get("/topratedproducts", async function (req, res, next) {
  console.log("*******top rated products************");
  var medicine_id = req.query.medicine_id;
  var user_id = req.query.user_id;

  if (user_id) {
    var user_wishlist = (await getWishlistStatus(user_id)) || [];
  }

  db.query(
    `SELECT mr.medicine_id, m.name, m.buying_price as mrp, m.selling_price, m.image, m.sale, m.is_active,
    COUNT(mr.rating) as total_ratings,  AVG(mr.rating) as average_star_rating 
    FROM medicine_ratings as mr, medicines as m 
    WHERE mr.status= ? && m.id = mr.medicine_id 
    GROUP BY mr.medicine_id HAVING AVG(mr.rating) >= 4`,
    [1],
    function (err, results, fields) {
      if (err) {
        console.log("Unable to find top medicines : ", err);
        res.status(500).json({
          code: 100,
          message: "Unable to fetch top medicines",
        });
      } else {
        console.log(results);
        var data = results;
        for (var i = 0; i < data.length; i++) {
          var img = data[i].image;
          if (img) {
            data[i].image = config.medicine_image + "/" + img;
          } else {
            data[i].image = "http://dotrx.in/images/no-image.png";
          }

          if (user_id) {
            if (user_wishlist.includes(data[i].medicine_id)) {
              data[i].wishlist_status = true;
            } else {
              data[i].wishlist_status = false;
            }
          }
        }

        res.status(200).json({
          code: 200,
          data: data,
        });
      }
    }
  );
});

module.exports = router;
