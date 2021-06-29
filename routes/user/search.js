var express = require("express");
var router = express.Router();
var db = require("../../database");
var { getRatings, getWishlistStatus } = require("../utils");

const MEDICINE_IMAGE_PATH = "http://dotrx.in/public/images/medicines/";

router.get("/products", async function (req, res, next) {
  console.log("*************Search Medicines*****************");
  var keyword = req.query.keyword;
  var start = req.query.start;
  var end = req.query.end;
  var total_items = 0;

  var user_id = req.query.user_id;

  if (user_id) {
    var user_wishlist = (await getWishlistStatus(user_id)) || [];
  }

  db.query(
    `select id as medicine_id, name, buying_price as mrp, selling_price, image, sale, is_active 
    from medicines where name like ?
      order by id desc limit ?, ?`,
    [`%${keyword}%`, parseInt(start), parseInt(end)],
    async function (err, results, fields) {
      if (err) {
        console.log(err);
        console.log("Unable to fetch medicines :", err);
        res.status(500).json({
          code: 100,
          message: "Unable to fetch medicines ",
        });
      } else if (results.length == 0) {
        res.status(200).json({
          code: 100,
          message: "No Such medicines available",
          data: {
            total_items: 0,
            results,
          },
        });
      } else {
        console.log(results);
        for (var i = 0; i < results.length; i++) {
          if (results[i].image == null) {
            results[i].image = "http://dotrx.in/images/no-image.png";
          } else {
            results[i].image = MEDICINE_IMAGE_PATH + results[i].image;
          }
          var ratings = await getRatings(results[i].medicine_id);
          results[i].total_ratings = ratings.total_ratings;
          results[i].average_star_rating = ratings.average_star_rating;

          if (user_id) {
            if (user_wishlist.includes(results[i].medicine_id)) {
              results[i].wishlist_status = true;
            } else {
              results[i].wishlist_status = false;
            }
          }
        }
        var data = results;
        db.query(
          `select count(*) as total_items
          from medicines where name like ?`,
          [`%${keyword}%`],
          async function (err, results, fields) {
            if (err) {
              total_count = 0;
            } else {
              if (results.length > 0) {
                total_items = results[0].total_items;
              }
            }
            res.status(200).json({
              code: 200,
              data: {
                results: data,
                total_items: total_items,
              },
            });
          }
        );
      }
    }
  );
});

router.get("/medicine", async function (req, res, next) {
  console.log("*************Search Medicines*****************");
  var keyword = req.query.keyword;
  var start = req.query.start;
  var end = req.query.end;
  var total_count = 0;

  var user_id = req.query.user_id;

  if (user_id) {
    var user_wishlist = (await getWishlistStatus(user_id)) || [];
  }
  db.query(
    `select m.id as medicine_id, concat(m.name, " in ", c.name) as suggested_name, 
      m.name, m.selling_price, m.buying_price as mrp, m.image, m.sale, m.is_active 
      from medicines as m, categories as c 
      where m.name like ? && m.category_id = c.id 
      order by m.id desc limit ?, ?`,
    [`%${keyword}%`, parseInt(start), parseInt(end)],
    async function (err, results, fields) {
      if (err) {
        console.log(err);
        console.log("Unable to fetch medicines :", err);
        res.status(500).json({
          code: 100,
          message: "Unable to fetch medicines ",
        });
      } else if (results.length == 0) {
        res.status(200).json({
          code: 200,
          message: "No Such medicines available",
          data: {
            total_items: 0,
            results,
          },
        });
      } else {
        console.log(results);
        for (var i = 0; i < results.length; i++) {
          if (!results[i].image) {
            results[i].image = "http://dotrx.in/images/no-image.png";
          } else {
            console.log(results[i].image);
            results[i].image = MEDICINE_IMAGE_PATH + results[i].image;
          }
          var ratings = await getRatings(results[i].medicine_id);
          results[i].total_ratings = ratings.total_ratings;
          results[i].average_star_rating = ratings.average_star_rating;

          if (user_id) {
            if (user_wishlist.includes(results[i].medicine_id)) {
              results[i].wishlist_status = true;
            } else {
              results[i].wishlist_status = false;
            }
          }
        }
        var data = results;
        db.query(
          `select count(*) as total_items
            from medicines as m, categories as c 
            where m.name like ? && m.category_id = c.id `,
          [`%${keyword}%`, parseInt(start), parseInt(end)],
          async function (err, results, fields) {
            if (err) {
              total_count = 0;
            } else {
              if (results.length > 0) {
                total_items = results[0].total_items;
              }
              res.status(200).json({
                code: 200,
                data: {
                  results: data,
                  total_items: total_items,
                },
              });
            }
          }
        );
      }
    }
  );
});

router.get("/medicine/category", async function (req, res, next) {
  console.log("*************Search Medicines in Category*****************");
  var keyword = req.query.keyword;
  var start = req.query.start;
  var end = req.query.end;
  var categoryId = req.query.categoryId;
  var total_items = 0;

  var user_id = req.query.user_id;

  if (user_id) {
    var user_wishlist = (await getWishlistStatus(user_id)) || [];
  }
  db.query(
    `select m.id as medicine_id, concat(m.name, " in ", c.name) as suggested_name, 
      m.name, m.selling_price, m.buying_price as mrp, m.image, m.sale, m.is_active 
      from medicines as m, categories as c 
      where m.category_id = ? && m.name like ? && c.id= ? 
      order by m.id desc limit ?, ?`,
    [categoryId, `%${keyword}%`, categoryId, parseInt(start), parseInt(end)],
    async function (err, results, fields) {
      if (err) {
        console.log(err);
        console.log("Unable to fetch medicines by category :", err);
        res.status(500).json({
          code: 100,
          message: "Unable to fetch medicines by category",
        });
      } else if (results.length == 0) {
        res.status(200).json({
          code: 100,
          message: "No Such medicines available",
          data: {
            total_items: 0,
            results,
          },
        });
      } else {
        console.log(results);
        for (var i = 0; i < results.length; i++) {
          if (results[i].image == null) {
            results[i].image = "http://dotrx.in/images/no-image.png";
          } else {
            results[i].image = MEDICINE_IMAGE_PATH + results[i].image;
          }
          var ratings = await getRatings(results[i].medicine_id);
          results[i].total_ratings = ratings.total_ratings;
          results[i].average_star_rating = ratings.average_star_rating;

          if (user_id) {
            if (user_wishlist.includes(results[i].medicine_id)) {
              results[i].wishlist_status = true;
            } else {
              results[i].wishlist_status = false;
            }
          }
        }
        var data = results;
        db.query(
          `select count(*) as total_items 
            from medicines as m, categories as c 
            where m.category_id = ? && m.name like ? && c.id= ? `,
          [categoryId, `%${keyword}%`, categoryId],
          async function (err, results, fields) {
            if (err) {
              total_count = 0;
            } else {
              if (results.length > 0) {
                total_items = results[0].total_items;
              }
              res.status(200).json({
                code: 200,
                data: {
                  results: data,
                  total_items: total_items,
                },
              });
            }
          }
        );
      }
    }
  );
});

router.get("/medicine/brand", async function (req, res, next) {
  console.log("*************Search Medicines in brand*****************");
  var keyword = req.query.keyword;
  var start = req.query.start;
  var end = req.query.end;
  var brandId = req.query.brandId;
  var total_items = 0;

  var user_id = req.query.user_id;

  if (user_id) {
    var user_wishlist = (await getWishlistStatus(user_id)) || [];
  }

  db.query(
    `select m.id as medicine_id, concat(m.name, " in ", c.name) as suggested_name, 
    m.name, m.selling_price, m.buying_price as mrp, m.image, m.sale, m.is_active from medicines as m, categories as c, brands as b 
    where m.brand_id = ? && m.name like ? && m.brand_id=b.id && m.category_id=c.id 
    order by m.id desc limit ?, ?`,
    [brandId, `%${keyword}%`, parseInt(start), parseInt(end)],
    async function (err, results, fields) {
      if (err) {
        console.log(err);
        console.log("Unable to fetch medicines by brand :", err);
        res.status(500).json({
          code: 100,
          message: "Unable to fetch medicines by brand",
        });
      } else if (results.length == 0) {
        res.status(200).json({
          code: 100,
          message: "No Such medicines available",
          data: {
            total_items: 0,
            results,
          },
        });
      } else {
        console.log(results);
        for (var i = 0; i < results.length; i++) {
          if (results[i].image == null) {
            results[i].image = "http://dotrx.in/images/no-image.png";
          } else {
            results[i].image = MEDICINE_IMAGE_PATH + results[i].image;
          }
          var ratings = await getRatings(results[i].medicine_id);
          results[i].total_ratings = ratings.total_ratings;
          results[i].average_star_rating = ratings.average_star_rating;

          if (user_id) {
            if (user_wishlist.includes(results[i].medicine_id)) {
              results[i].wishlist_status = true;
            } else {
              results[i].wishlist_status = false;
            }
          }
        }
        var data = results;
        db.query(
          `select count(*) as total_items 
          from medicines as m, categories as c, brands as b 
          where m.brand_id = ? && m.name like ? && m.brand_id=b.id && m.category_id=c.id `,
          [brandId, `%${keyword}%`],
          async function (err, results, fields) {
            if (err) {
              total_count = 0;
            } else {
              if (results.length > 0) {
                total_items = results[0].total_items;
              }
              res.status(200).json({
                code: 200,
                data: {
                  results: data,
                  total_items: total_items,
                },
              });
            }
          }
        );
      }
    }
  );
});

module.exports = router;
