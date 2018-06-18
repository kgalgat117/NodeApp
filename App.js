var express = require('express');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var dm = require('date-fns/difference_in_months');
var passport = require('passport');
var multer = require('multer');  /// to handle file upload
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './tmp/my-uploads') /// location of file upload on server
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname) // file name
  }
}); 
var upload = multer({ storage: storage })
var LocalStrategy = require('passport-local');
var FacebookStrategy = require('passport-facebook').Strategy;
var passportLocalMongoose = require('passport-local-mongoose'); ///// to add some additional methods to user schema for authentication

mongoose.connect('mongodb://localhost/rent_app');

var depTenentSchema = new mongoose.Schema({
    name: String,
    depdate: Date,
    recieved: Number
});

var readTenentSchema = new mongoose.Schema({
    name: String,
    readdate: Date,
    reading: Number
});


var depTenent = mongoose.model('depTenent', depTenentSchema);
var readTenent = mongoose.model('readTenent', readTenentSchema);

var UserSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true
    },
    password: String,
    facebook: JSON,
    admin: Boolean
});
UserSchema.plugin(passportLocalMongoose); /// adding additional methods to user schema

var User = mongoose.model('User', UserSchema);


var newTenentSchema = new mongoose.Schema({
    name: {
        type: String,
        unique: true
    },
    address: String,
    alloted: String,
    mobile: Number,
    adhaar: Number,
    rent: Number,
    start: Date,
    sreading: Number,
    erate: Number,
    advance: Number,
    members: Number,
    type: String,
    status: Boolean,
    end: Date,
    deposite: [{
        type: mongoose.Schema.Types.ObjectId, /// foreign key
        ref: "depTenent"
    }],
    reading: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "readTenent"
    }]
});

var newTenent = mongoose.model('newTenent', newTenentSchema);

const app = express();

//*******Passport Setup*******////////


app.use(require('express-session')({
    secret: "Rent Bharo App setup sessions", /////string used to encode sessions
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize()); ///initialize passport
app.use(passport.session()); ///initialize sessions
passport.use(new LocalStrategy(User.authenticate())); //stategy to use to authenticate the user,added to user schema by passport-local-mongoose
passport.use(new FacebookStrategy({
        clientID: '248605219051209',
        clientSecret: 'd233b65160f0994543358e17d79177a7',
        callbackURL: "http://localhost:3000/auth/facebook/callback"
    },
    function (accessToken, refreshToken, profile, cb) {
        User.findOne({
            'facebook.id': profile.id
        }, function (err, user) {
            if (err) {
                console.log(err);
            }
            //No user was found... so create a new user with values from Facebook (all the profile. stuff)
            if (!user) {
                
                /*
                User.register(new User({
                    username: profile.displayName,
                    admin: false,
                    facebook: profile._json
                }), profile.emails.value, function (err, userr) {
                    if (err) {
                        console.log(err)
                    } else {
                        console.log(userr)
                    }
                });
                */
                
                user = new User({
                    username: profile.displayName,
                    //email: profile.emails[0].value,
                    //username: profile.username,
                    //provider: 'facebook',
                    //now in the future searching on User.findOne({'facebook.id': profile.id } will match because of this next line
                    facebook: profile._json
                });
                user.save(function (err) {
                    if (err) console.log(err);
                    return cb(err, user);
                });
                
            } else {
                //found user. Return
                return cb(err, user);
            }
        });
    }
));
passport.serializeUser(User.serializeUser()); ///  used to encode sessions
passport.deserializeUser(User.deserializeUser()); /// decode sessions

////*******************////////////////

////***** body parser setup to retrieve form data ***********////////////
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(express.static('public')); /////include public directory to process
app.set("view engine", "ejs") /////  setting default engine///
////////////***********************///////////////


app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/callback', passport.authenticate('facebook', {
    failureRedirect: '/login'
}), function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/viewall');
});

app.get('/view/:name', isLoggedIn, function (req, res) {
    var name = req.params.name;
    depTenent.find({
        name: name
    }, function (err, depos) {
        if (err) {
            console.log(err)
        } else {
            readTenent.find({
                name: name
            }, function (err, reads) {
                if (err) {
                    console.log(err)
                } else {
                    newTenent.find({
                        name: name
                    }, function (err, news) {
                        if (err) {
                            console.log(err)
                        } else {
                            res.render('view', {
                                news: news,
                                reads: reads,
                                depos: depos,
                                dm: dm
                            })
                        }
                    })
                }
            })
        }
    });
});

app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/login');
});

app.get('/login', function (req, res) {
    res.render('login')
});

app.post('/login', passport.authenticate("local", {
    successRedirect: "/viewall",
    failureRedirect: "/login"
}), function (req, res) {

});

app.get('/deposite', isLoggedIn, function (req, res) { /// middleware to check if user is logged in
    newTenent.find({}, function (err, tenents) {
        if (err) {
            console.log(err)
        } else {
            res.render('deposite', {
                tenents: tenents
            });
        }
    })
});

app.post('/deposite', isLoggedIn, function (req, res) {
    var deposite = new depTenent({
        name: req.body.name,
        depdate: req.body.date,
        recieved: req.body.amount
    });
    deposite.save(function (err, data) {
        if (err) {
            console.log(err);
        } else {
            newTenent.findOne({
                name: req.body.name
            }, function (err, tenne) {
                if (err) {
                    console.log(err)
                } else {
                    tenne.deposite.push(data)
                    tenne.save(function (err, result) {
                        if (err) {
                            console.log(err)
                        } else {
                            console.log(result)
                        }
                    })
                }
            })
        }
    })
    res.redirect('/viewall');
});

app.get('/reading', isLoggedIn, function (req, res) {
    newTenent.find({}, function (err, tenents) {
        if (err) {
            console.log(err);
        } else {
            res.render('reading', {
                tenents: tenents
            });
        }
    });
});

app.post('/reading', isLoggedIn, function (req, res) {
    var read = new readTenent({
        name: req.body.name,
        readdate: req.body.date,
        reading: req.body.read
    });
    read.save(function (err, data) {
        if (err) {
            console.log(err);
        } else {
            newTenent.findOne({
                name: req.body.name
            }, function (err, tenee) {
                if (err) {
                    console.log(err)
                } else {
                    tenee.reading.push(data);
                    tenee.save(function (err, result) {
                        if (err) {
                            console.log(err)
                        } else {
                            console.log(result)
                        }
                    })
                }
            })
        }
    })
    res.redirect('/viewall');
});

app.get('/register', isLoggedIn, function (req, res) {
    res.render('register')
});

app.post('/register', isLoggedIn, upload.single('image') , function (req, res) {
    var dd = new Date();
    if (req.body.status == 'false') {
        console.log("right");
        dd = new Date(req.body.sdate);
    }
    var Tenent = new newTenent({
        name: req.body.name,
        address: req.body.address,
        alloted: req.body.roomalloted,
        mobile: req.body.mobile,
        adhaar: req.body.adhaar,
        rent: req.body.rent,
        start: req.body.sdate,
        sreading: req.body.sread,
        advance: req.body.adv,
        members: req.body.mem,
        erate: req.body.erate,
        type: req.body.type,
        status: req.body.status,
        end: dd
    })
    Tenent.save(function (err) {
        if (err) {
            console.log("error");
        } else {
            console.log("saved tenent");
        }
    });

    User.register(new User({
        username: req.body.name,
        admin: false
    }), req.body.adhaar, function (err, user) {
        if (err) {
            console.log(err)
        } else {
            console.log(user)
        }
    });


    var fread = new readTenent({
        name: req.body.name,
        readdate: req.body.sdate,
        reading: req.body.sread
    });
    fread.save(function (err, data) {
        if (err) {
            console.log(err)
        } else {
            newTenent.findOne({
                name: req.body.name
            }, function (err, tenee) {
                if (err) {
                    console.log(err)
                } else {
                    tenee.reading.push(data);
                    tenee.save(function (err, result) {
                        if (err) {
                            console.log(err)
                        } else {
                            console.log(result)
                        }
                    })
                }
            })
        }
    })

    res.redirect('/viewall');
});

app.get('/viewall', isLoggedIn, function (req, res) {
    newTenent.find({}, function (err, tenents) {
        if (err) {
            console.log(err);
        } else {
            res.render('viewall', {
                tenents: tenents
            });
        }
    });

});

function isLoggedIn(req, res, next) { // general format for middleware
    if (req.isAuthenticated()) { /// built-in method in passport
        return next(); /// execute the next function 
    }
    res.redirect('/login');
}

app.listen(3000, function (err) {
    console.log("server started on 3000");
});
