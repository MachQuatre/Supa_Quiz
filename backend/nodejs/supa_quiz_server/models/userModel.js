const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
    user_id: { type: String, unique: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ["user", "admin", "super_user"],
        default: "user"
      },      
    score_total: { type: Number, default: 0 },
    // ✅ Avatar choisi par l'utilisateur
    avatar_choisi: {type: String,default: "assets/avatars/avatar1.png"},

    // ✅ Un seul champ texte pour l’état des achievements
    achievement_state: { type: [String], default: [] }
    }, { timestamps: true });

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

module.exports = mongoose.model("User", userSchema);