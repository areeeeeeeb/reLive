exports.up = (pgm) => {
  pgm.sql(`
    INSERT INTO users (auth0_id, email, username, display_name)
    VALUES ('dev|test-user', 'test@example.com', 'testuser', 'Test User');
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM users WHERE auth0_id = 'dev|test-user';
  `);
};
