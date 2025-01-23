const bcrypt = require('bcryptjs');

(async () => {
    const plainPassword = 'pass';
    const hashedPassword = await bcrypt.hash(plainPassword, 10); // 10 is the salt rounds ??
    console.log(hashedPassword); 
})();

