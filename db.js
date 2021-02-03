const spicedPg = require("spiced-pg");
const db = spicedPg(process.env.DATABASE_URL || "postgres:Silke:@localhost:5432/petition");

// add new signature to the database and return a promise
// avoid sql injection with placeholder $1, $2 ... 
exports.addSignature = (userId, signatureCode) => {
    return db.query("INSERT INTO signatures (user_id, signature_code) VALUES($1, $2) RETURNING id;",
    [userId, signatureCode]
    );
}

// get the signers out of the database
exports.getSigners = () => {
    return db.query(`SELECT * FROM signatures
        JOIN users ON (signatures.user_id = users.id) 
        LEFT JOIN user_profiles ON (user_profiles.user_id = users.id);`
    );
}

// get signature
exports.getSignature = signatureId => {
    return db.query("SELECT * FROM signatures WHERE id = $1;", [signatureId]);
}

// add user to registration
exports.addUser = (firstname, lastname, email, hashedPassword) => {
    return db.query(
        "INSERT INTO users (firstname, lastname, email, password_hash) VALUES($1, $2, $3, $4) RETURNING *;",
        [firstname, lastname, email, hashedPassword]
    );
};

// validate email
exports.getUserByEmail = (email) => {
    return db.query(
        "SELECT * FROM users WHERE email = $1;",
        [email]
    );
};

// add profile
exports.addProfile = (userId, age, city, homepage) => {
    return db.query(
        "INSERT INTO user_profiles (user_id, age, city, homepage) VALUES ($1, $2, $3, $4);",
        [userId, age, city, homepage]
    );
};

// get user by id 
exports.getUserById = (id) => {
    return db.query("SELECT * FROM users WHERE id = $1;", [id]);
};

// get profile by user id 
exports.getProfileByUserId = (userId) => {
    return db.query("SELECT * FROM user_profiles WHERE user_id = $1;", [userId]);
};


// update user profile
exports.updateUserData = (userId, firstname, lastname, email) => {
    return db.query(
      `UPDATE users SET firstname = $1, lastname = $2, email = $3 WHERE id = $4;`,
      [firstname, lastname, email, userId]
    );
  };

// set new password
exports.updatePasswordHash = (userId, passwordHash) => {
    return db.query("UPDATE users SET password_hash = $1 WHERE id = $2;",
      [passwordHash, userId]
    );
};

// update profile data
exports.updateProfileData = (userId, age, city, homepage) => {

    // UPSERT = UPdate + inSERT ;)
    return db.query(
      `INSERT INTO user_profiles (user_id, age, city, homepage)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO
        UPDATE 
            SET age = $2,
                city = $3,
                homepage = $4;`,
      [userId, age, city, homepage]
    );
};

// unsign petition & delete user
exports.deleteSignature = (userId) => {
    return db.query("DELETE FROM signatures WHERE user_id = $1;", [userId]);
};