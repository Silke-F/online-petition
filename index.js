const express = require("express");
const helmet = require("helmet");
const expressHandlebars = require("express-handlebars");
const db = require("./db.js");
const cookieParser = require('cookie-parser');
const cookieSession = require("cookie-session");
const csurf = require('csurf');
const passwords = require("./passwords.js");
const { response, request } = require("express");

// setup express and middlewares
const app = express();
app.use(helmet());
app.use(express.static("static"));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cookieSession({
  // how long should session last
  maxAge: 1000 * 60 * 60 * 24 * 14, // in ms -> 14 days
  // makes it more secure through an individual "signature"
  secret: "D_abr#=kSU?P?R~d}vj_"
}));
app.use(csurf()); 

const handlebarsEngine = expressHandlebars.create({});
app.engine("handlebars", handlebarsEngine.engine);
app.set("view engine", "handlebars");

// debugging middleware
app.use((request, response, next) => {
  console.log("spyyy", request.url, request.cookies, request.session);
  next();
});

// csrf token
app.use(function(req, res, next) {
  res.locals.csrfToken = req.csrfToken();
  next();
});   

// change view if logged in ( mit locals wird alles an alle handlebars übergeben/zugänglich gemacht)
app.use(function (request, response, next) {
  response.locals.userId = request.session.userId;
  next();
});


// access users from every handlebar template
app.use((request, response, next) => {

  if(!request.session.userId) {
    return next();
  }
  
  db.getUserById(request.session.userId)
    .then(result => {
      response.locals.user = result.rows[0];
      next();
    })
    .catch(error => {
      console.log(error);
      next();
    });
});



// --------------------------------------------------------
// homepage route
app.get("/", (request, response) => {
  if(request.cookies.signed) {
    return response.redirect(302, "/thank-you");
  }
  response.render("home");
});



// -------------------------------------------------------
// post route signature form - accept the data from the form
app.post("/sign-petition", (request, response) => {
  // check if all the fields are filled out -> "validation"
  // !! everything that is sent via form is inside the request.body
  if (!request.body.signature_code) {
    response.render("home", {
      error: "Please fill out all fields",
    });
    return;
  }

  // put the data into the database

  const userId = request.session.userId;
  db.addSignature(userId, request.body.signature_code)
    .then((result) => {
    // get the id from the signature 
    const signatureId = result.rows[0].id;
    // set cookie session and put the signature id into it
    request.session.signatureId = signatureId; 
    // set a cookie about already having signed 
    response.cookie("signed", true);



    // if there is no cookie set and want to access the thank-you page, they will be redirected to home
    // redirect the user to the thank-you page
    response.redirect(302, "/thank-you");
  });
});



// -------------------------------------------------------
// thank you route
app.get("/thank-you", (request, response) => {
    if(!request.cookies.signed) {
    return response.redirect(302, "/");
  }

  // getting the signature id from the session and show thank you page
  const signatureId = request.session.signatureId;
  db.getSignature(signatureId).then(result => {    

    const signature = result.rows[0];
    response.render("thank-you", {
      signature: signature,
    });
  });
});



// -------------------------------------------------------
// signers route
app.get("/signers", (request, response) => {
  // get the signers from the database
  db.getSigners().then((result) => {
    // render a view with those signers
    response.render("signers", {      
    signers: result.rows
    });
  });
});



// -------------------------------------------------------
// signature route
app.get("/signature", (request, response) => {
  response.render("signature");
});



// -------------------------------------------------------
// unsign route
app.post("/unsign", (request, response) => {
  // Get the user id from the session
  const userId = request.session.userId;

  // Delete the signature from the database
  db.deleteSignature(userId).then((result) => {
    // Redirect to the signing page
    response.redirect(302, "/register");
  });
});



// -------------------------------------------------------
// registration route

app.get("/register", (request, response) => {
  response.render("register");
});

app.post("/register", (request, response) => {

  const {firstname, lastname, password, email} = request.body;

  // Validate input (firstname, lastname, email, password)
  if (!firstname || !lastname || !email || !password) {
    response.render("register", {
      error: "Please fill out all fields",
    });
  }

  // Hash the password

  passwords.saltAndHash(password)
      .then(hashedPassword => {
          // then -> save the user in the database
          db.addUser(firstname, lastname, email, hashedPassword)
              .then(result => {
                  // Store the user id in the session
                  const createdUserId = result.rows[0].id;
                  request.session.userId = createdUserId;

                  response.redirect(302, "/profile");
              });
      });
    });
    
    
    // -------------------------------------------------------
    // logout route
    
    app.post("/logout", (request, response) => {
      request.session = null,
      response.redirect(302, "/")
    });


// -------------------------------------------------------
// login route

app.get("/login", (request, response) => {
  response.render("login");
});

app.post("/login", (request, response) => {

  const {email, password} = request.body;

// Validation
  if (!email || !password) {
    response.render("login", {
      error: "Please fill out all fields",
    });
    return;
  }

  // Load the user, that belong to this email address
  db.getUserByEmail(email)
      .then(result => {

        if(result.rows.length == 0) {
          return response.send("Error logging in. User does not exist."); 
        }

          // then -> compare the password (from the form) to the password hash in the database
          const passwordHashFromDB = result.rows[0].password_hash;
          passwords.compare(password, passwordHashFromDB).then(passwordIsCorrect => {

              // then -> same? Save the user id in the session and redirect to canvas page
              if(passwordIsCorrect) {
                  request.session.userId = result.rows[0].id;
                  response.redirect(302, "/");
              } else {
                  response.send("Error logging in. Password incorrect.");
              }
          });
          
      })
});





// -------------------------------------------------------
// profile route

app.get("/profile", (request, response) => {
    console.log("request.session", request.session);
    response.render("profile", {
  });
});

app.post("/profile", (request, response) => {

  const { age, city, homepage } = request.body;

  if (!age || !city || !homepage) {
    response.render("profile", {
      error: "Please fill out all fields",
    });
    return;
  }

  // add this data to the users profile table 
  db.addProfile(request.session.userId, age, city, homepage)
      .then((result) => {
    // redirect user to the canvas page
    response.redirect(302, "/signature");
  })
    .catch((err) => {
    console.log(err);
    response.send("Something went wrong :(");
  });
});



// -------------------------------------------------------
// edit profile route

app.get("/edit-profile", (request, response) => {

  const userId = request.session.userId;

  // load user data
  const userPromise = db.getUserById(userId);

  // load profile data
  const profilePromise = db.getProfileByUserId(userId);

  Promise.all([userPromise, profilePromise])
    .then(results => {
      
      const userResults = results[0];
      const profileResults = results[1];
      const user = userResults.rows[0];
      const profile = profileResults.rows[0];
      
      // show user data
      response.render("edit-profile", {
        user,
        profile
      });
    });
});


app.post("/edit-profile", (request, response) => {

  const userId = request.session.userId;

  // check login --> TBD!!!


  // Update the user data (firstname, lastname, email)
  const {firstname, lastname, email} = request.body;
  const updateUserPromise = db.updateUserData(userId, firstname, lastname, email);

  // change password, if filled out
  const { password } = request.body;
  let updatePasswordPromise;
  if(password) {
     updatePasswordPromise = passwords.saltAndHash(password)
          .then( passwordHash => {
            return db.updatePasswordHash(userId, passwordHash);
          });
  }

  // change profile data
  const {age, city, homepage} = request.body;
  const updateProfilePromise = db.updateProfileData(userId, age, city, homepage);


  // send user to the thank-you page
  Promise.all([updateUserPromise, updatePasswordPromise, updateProfilePromise])
         .then(result => {
           response.redirect(302, "/thank-you");
         })
         .catch(error => {
           console.log("error", error);
           response.send("Something went wrong :(");
         });

});



app.listen(process.env.PORT || 8080);