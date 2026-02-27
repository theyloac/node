CREATE OR REPLACE PACKAGE BODY auth_pkg AS
   l_header CONSTANT VARCHAR2(32767) := '{"alg":"HS256","typ":"JWT"}';
  ------------------------------------------------------------------
  -- Utility: Base64URL encode RAW, private function, RFC 4648 compliant
  ------------------------------------------------------------------
   FUNCTION base64url_encode (
      p_raw IN RAW
   ) RETURN VARCHAR2 IS
      l_b64 VARCHAR2(32767);
   BEGIN
      l_b64 := UTL_RAW.CAST_TO_VARCHAR2(UTL_ENCODE.BASE64_ENCODE(p_raw));
      l_b64 := REPLACE(REPLACE(l_b64, CHR(10), ''), CHR(13), '');
      l_b64 := REPLACE(l_b64, '+','-');
      l_b64 := REPLACE(l_b64, '/', '_');
      l_b64 := REPLACE(l_b64, '=', '');
      RETURN l_b64;
   END;

  ------------------------------------------------------------------
  -- Utility: Hash password with SHA-256
  ------------------------------------------------------------------
   FUNCTION hash_password (
      p_password IN VARCHAR2
   ) RETURN VARCHAR2 IS
      l_raw  RAW(256);
      l_hash RAW(256);
   BEGIN
      l_raw := UTL_RAW.CAST_TO_RAW(p_password);
      l_hash := DBMS_CRYPTO.HASH(
         l_raw,
         DBMS_CRYPTO.HASH_SH256
      );
      RETURN RAWTOHEX(l_hash);
   END;

   ------------------------------------------------------------------
   -- Utility: Create JWT with 5-minute expiry
    ------------------------------------------------------------------
   FUNCTION generate_jwt(
      p_user_id IN NUMBER,
      p_role IN VARCHAR2,
      p_exp_utc OUT TIMESTAMP WITH TIME ZONE
   ) RETURN VARCHAR2 IS
     -- l_header    VARCHAR2(32767) := '{"alg":"HS256","typ":"JWT"}';
      l_payload   VARCHAR2(32767);
      l_secret    VARCHAR2(64)    := sys.get_jwt_secret;
      l_header_b64 VARCHAR2(32767);
      l_payload_b64 VARCHAR2(32767);
      l_signature RAW(256);
      l_signature_b64 VARCHAR2(32767);
      l_exp NUMBER;
      l_jti VARCHAR2(64);
      l_now_utc   TIMESTAMP WITH TIME ZONE;
   BEGIN
      -- Current UTC time
      l_now_utc := SYSTIMESTAMP AT TIME ZONE 'UTC';

      -- Expiry in UTC (5 minutes later)
      p_exp_utc := l_now_utc + INTERVAL '5' MINUTE;

      -- Convert to epoch seconds
      l_exp := TRUNC(
               (CAST(p_exp_utc AS DATE) - DATE '1970-01-01') * 86400
               );

      -- unique ID for token (entropy)
      l_jti := RAWTOHEX(SYS_GUID());

      l_payload := '{"sub":' || p_user_id ||
                  ',"role":"' || p_role ||
                  '","exp":' || l_exp ||
                  ',"jti":"' || l_jti || '"}';

      l_header_b64  := base64url_encode(UTL_RAW.CAST_TO_RAW(l_header));
      l_payload_b64 := base64url_encode(UTL_RAW.CAST_TO_RAW(l_payload));

      -- signature: HMAC SHA256
      l_signature := DBMS_CRYPTO.MAC(
               UTL_RAW.CAST_TO_RAW(l_header_b64 || '.' || l_payload_b64),
               DBMS_CRYPTO.HMAC_SH256,
               UTL_RAW.CAST_TO_RAW(l_secret)
                     );

      l_signature_b64 := base64url_encode(l_signature);

      RETURN l_header_b64 || '.' || l_payload_b64 || '.' || l_signature_b64;
   END;

   ------------------------------------------------------------------
   -- Register new user
   ------------------------------------------------------------------
   FUNCTION register_user (
      p_firstname IN VARCHAR2,
      p_lastname  IN VARCHAR2,
      p_username IN VARCHAR2,
      p_email    IN VARCHAR2,
      p_password IN VARCHAR2,
      p_role     IN VARCHAR2 DEFAULT 'USER'
   ) RETURN NUMBER IS
      l_user_id   NUMBER := 0;
      l_hash      VARCHAR2(256);
      l_count     NUMBER;
   BEGIN
      --------------------------------------------------------------------
      -- Basic required field checks
      --------------------------------------------------------------------
      IF p_username IS NULL OR TRIM(p_username) IS NULL THEN
         raise_application_error(-20001, 'Username is required.');
      END IF;

      IF p_email IS NULL OR TRIM(p_email) IS NULL THEN
         raise_application_error(-20002, 'Email is required.');
      END IF;

      IF p_password IS NULL OR TRIM(p_password) IS NULL THEN
         raise_application_error(-20003, 'Password is required.');
      END IF;

      --------------------------------------------------------------------
      -- Email format check (simple regex, adjust if needed)
      --------------------------------------------------------------------
      IF NOT REGEXP_LIKE(
               p_email,
               '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
            ) THEN
         raise_application_error(-20004, 'Invalid email format.');
      END IF;

      --------------------------------------------------------------------
      -- Password strength checks (tune to your policy)
      --------------------------------------------------------------------
      IF LENGTH(p_password) < 8 THEN
         raise_application_error(-20005, 'Password must be at least 8 characters long.');
      END IF;

      IF NOT REGEXP_LIKE(p_password, '[0-9]') THEN
         raise_application_error(-20006, 'Password must contain at least one digit.');
      END IF;

      --------------------------------------------------------------------
      -- Role validation (simple whitelist – adjust for your app)
      --------------------------------------------------------------------
      IF UPPER(NVL(p_role, 'USER')) NOT IN ('USER', 'ADMIN') THEN
         raise_application_error(-20007, 'Invalid role specified.');
      END IF;

      --------------------------------------------------------------------
      -- Uniqueness checks: username and email
      --------------------------------------------------------------------
      SELECT COUNT(*)
      INTO l_count
      FROM users
      WHERE LOWER(user_username) = LOWER(p_username);

      IF l_count > 0 THEN
         raise_application_error(-20008, 'Username already exists.');
      END IF;

      SELECT COUNT(*)
      INTO l_count
      FROM users
      WHERE LOWER(user_email) = LOWER(p_email);

      IF l_count > 0 THEN
         raise_application_error(-20009, 'Email already exists.');
      END IF;

      --------------------------------------------------------------------
      -- Core insert logic
      --------------------------------------------------------------------
      SELECT NVL(MAX(user_id), 0) + 1
      INTO l_user_id
      FROM users;

      l_hash := hash_password(p_password);

      INSERT INTO users (
         user_id,
         user_firstname,
         user_lastname,
         user_username,
         user_email,
         user_passwordhash,
         user_role,
         user_startdate,
         user_isactive
      ) VALUES (
                  l_user_id,
                  p_firstname,
                  p_lastname,
                  p_username,
                  p_email,
                  l_hash,
                  UPPER(NVL(p_role, 'USER')),
                  SYSTIMESTAMP,
                  'Y'
               );

      RETURN l_user_id;
   END register_user;


   -------------------------------------------------------------------
   -- Get user details by ID for display
   ------------------------------------------------------------------ 
   PROCEDURE getUserFromID (
         p_user_id IN NUMBER,
         p_firstname OUT VARCHAR2,
         p_lastname OUT VARCHAR2,
         p_username OUT VARCHAR2,   
         p_email OUT VARCHAR2,
         p_role OUT VARCHAR2
      ) IS
   BEGIN
      p_firstname := '';
      p_lastname := '';
      p_username := 'N/A'; -- in case of not found
      p_email := '';
      p_role := '';
      SELECT user_firstname,
             user_lastname,
             user_username,
             user_email,
             user_role
        INTO
         p_firstname,
         p_lastname,
         p_username,
         p_email,
         p_role
        FROM users
       WHERE user_id = p_user_id
         AND user_isactive = 'Y';
   END;  

   ------------------------------------------------------------------
   -- Login user: validate password, return JWT
   ------------------------------------------------------------------
   FUNCTION login_user (
      p_email    IN  VARCHAR2,
      p_password IN  VARCHAR2,
      p_ip       IN VARCHAR2,
      p_user_id  OUT users.user_id%TYPE,
      p_role     OUT users.user_role%TYPE
   ) RETURN VARCHAR2 IS
      l_user_id    users.user_id%TYPE;
      l_role       users.user_role%TYPE;
      l_dbhash     VARCHAR2(256);
      l_hash       VARCHAR2(256);
      l_token      VARCHAR2(4000);
      v_email      VARCHAR2(320);
      v_password   VARCHAR2(256);
      l_ip         VARCHAR(16);
      l_exp_utc    TIMESTAMP WITH TIME ZONE;
      l_exp        NUMBER;
   BEGIN
      v_email    := NVL(TRIM(p_email), '');
      v_password := NVL(TRIM(p_password), '');
      l_ip       := NVL(TRIM(p_ip), '');

      ---------------------------------------------------------------------------
      -- 1) GUEST: both empty
      ---------------------------------------------------------------------------
      IF (v_email is null) AND (v_password is null) THEN
         l_user_id := 0;
         l_role    := 'GUEST';

         l_token := generate_jwt(
                  l_user_id,
                  l_role,
                  l_exp_utc
                     );
      
         -- Convert expiration timestamp to epoch seconds
         l_exp := TRUNC(
            (CAST(l_exp_utc AS DATE) - DATE '1970-01-01') * 86400
         );

         INSERT INTO sessions (
               ses_token,
               user_id,
               ses_createdat,
               ses_expiresat,
               ses_eventtype
          --     ,caller_ip_addr
         ) VALUES (
                        l_token,
                        l_user_id,
                        SYSTIMESTAMP,
                        l_exp,
                        'GUEST_LOGIN'
              --          ,  l_ip
                  );

         p_user_id := l_user_id;
         p_role    := l_role;

         RETURN l_token;
      END IF;

      ---------------------------------------------------------------------------
      -- 2) Invalid: one empty, one not
      ---------------------------------------------------------------------------
      IF v_email = '' OR v_password = '' THEN
         RAISE_APPLICATION_ERROR(
                  -20100,
                  'Invalid credentials'
         );
      END IF;

      ---------------------------------------------------------------------------
      -- 3) Normal login: both non-empty
      ---------------------------------------------------------------------------
      SELECT user_id,
            user_passwordhash,
            user_role
      INTO l_user_id,
         l_dbhash,
         l_role
      FROM users
      WHERE LOWER(user_email) = LOWER(v_email)
         AND user_isactive = 'Y';

      l_hash := hash_password(v_password);

      DBMS_OUTPUT.PUT_LINE('Computed hash: ' || l_hash);
      DBMS_OUTPUT.PUT_LINE('DB hash:       ' || l_dbhash);

      IF l_hash != l_dbhash THEN
         RAISE_APPLICATION_ERROR(
                  -20100,
                  'Invalid credentials'
         );
      END IF;

      l_token := generate_jwt(
               l_user_id,
               l_role,
               l_exp_utc
                  );

      -- Convert expiration timestamp to epoch seconds
      l_exp := TRUNC(
         (CAST(l_exp_utc AS DATE) - DATE '1970-01-01') * 86400
      );

      INSERT INTO sessions (
         ses_token,
         user_id,
         ses_createdat,
         ses_expiresat,
         ses_eventtype
--         ,CALLER_IP_ADDR
      ) VALUES (
                  l_token,
                  l_user_id,
                  SYSTIMESTAMP,
                  l_exp,
                  'LOGIN'
--                , l_ip
               );

      UPDATE users
      SET user_lastlogin = SYSTIMESTAMP
      WHERE user_id = l_user_id;

      p_user_id := l_user_id;
      p_role    := l_role;

      RETURN l_token;
   END login_user;

   ------------------------------------------------------------------
   -- Refresh token
   ------------------------------------------------------------------
   FUNCTION refresh_token (
      p_old_token IN VARCHAR2,
      event       IN VARCHAR2 DEFAULT 'REFRESH'
   ) RETURN VARCHAR2 IS
      l_user_id         users.user_id%TYPE;
      l_role            users.user_role%TYPE;

      l_new_token   VARCHAR2(4000);
      l_expires_epoch     NUMBER;
      l_now_epoch         NUMBER;
      l_exp_utc      TIMESTAMP WITH TIME ZONE;
   BEGIN
      SELECT s.user_id,
            u.user_role,
            s.ses_expiresat
      INTO l_user_id,
         l_role,
         l_expires_epoch
      FROM sessions s
               JOIN users u ON u.user_id = s.user_id
      WHERE s.ses_token    = p_old_token
         AND u.user_isactive = 'Y';

      -- Convert "now" to epoch seconds
      l_now_epoch := TRUNC(
         (CAST(SYSTIMESTAMP AT TIME ZONE 'UTC' AS DATE) - DATE '1970-01-01') * 86400
      );

      -- Compare epoch expiration to epoch now
      IF l_expires_epoch <= l_now_epoch THEN
         RAISE_APPLICATION_ERROR(-20200, 'Token expired');
      END IF;


      -- OPTIONAL: revoke old token (recommended to prevent reuse)
      -- If you want to keep it valid until it naturally expires, REMOVE this update entirely.
      -- This is not an optional step if you want to enforce single-use refresh tokens.
      UPDATE sessions
      SET ses_expiresat = l_now_epoch  -- set to now to expire immediately 
         , ses_eventtype = 'REFRESHED'
      WHERE ses_token = p_old_token;

      -- generate_jwt must set l_exp_utc (expiry) as an OUT/IN OUT parameter
      l_new_token := generate_jwt(
               l_user_id,
               l_role,
               l_exp_utc
                     );

      -- Convert expiration timestamp to epoch seconds
      l_expires_epoch := TRUNC(
         (CAST(l_exp_utc AS DATE) - DATE '1970-01-01') * 86400
      );

      INSERT INTO sessions (
         ses_token,
         user_id,
         ses_createdat,
         ses_expiresat,
         ses_eventtype
      ) VALUES (
                  l_new_token,
                  l_user_id,
                  SYSTIMESTAMP,
                  l_expires_epoch, -- store as epoch seconds
                  event
               );

      RETURN l_new_token || ',USER_ID=' || l_user_id;

   EXCEPTION
      WHEN NO_DATA_FOUND THEN
         RAISE_APPLICATION_ERROR(-20201, 'Invalid token');
   END refresh_token;

   ------------------------------------------------------------------
   -- Validate token
   -- Returns TRUE if token exists and is not expired
   -- OUT parameters are populated only when valid
   ------------------------------------------------------------------
   FUNCTION verify_token (
      p_token          IN  VARCHAR2,
      p_event          OUT VARCHAR2,
      p_user_id        OUT users.user_id%TYPE,
      p_role           OUT users.user_role%TYPE,
      p_ses_expiredate OUT NUMBER
   ) RETURN BOOLEAN
   IS
      l_now_epoch   NUMBER;
   BEGIN
      -- Default OUT values
      p_event          := NULL;
      p_user_id        := NULL;
      p_role           := NULL;
      p_ses_expiredate := NULL;

      -- Convert "now" to epoch seconds
      l_now_epoch := TRUNC(
         (CAST(SYSTIMESTAMP AT TIME ZONE 'UTC' AS DATE) - DATE '1970-01-01') * 86400
      );

      -- Attempt to retrieve session + user info
      BEGIN
         SELECT s.ses_eventtype,
                  s.user_id,
                  u.user_role,
                  s.ses_expiresat
         INTO   p_event,
                  p_user_id,
                  p_role,
                  p_ses_expiredate
         FROM   sessions s
                  JOIN users u ON u.user_id = s.user_id
         WHERE  s.ses_token    = p_token
         AND    u.user_isactive = 'Y';
      EXCEPTION
         WHEN NO_DATA_FOUND THEN
               RETURN FALSE;  -- token not found or user inactive
      END;

      -- Check expiration
      IF p_ses_expiredate <= l_now_epoch THEN
         RETURN FALSE;  -- expired
      END IF;

      RETURN TRUE;  -- valid token

   EXCEPTION
      WHEN OTHERS THEN
         -- Unexpected internal error
         -- You may log this if desired
         RETURN FALSE;
   END verify_token;

   ------------------------------------------------------------------
   -- Logout
   ------------------------------------------------------------------
   PROCEDURE logout(p_token IN VARCHAR2) IS
      l_expires   sessions.ses_expiresat%TYPE;
      l_now_epoch NUMBER;
   BEGIN
      BEGIN
         SELECT ses_expiresat
         INTO l_expires
         FROM sessions
         WHERE ses_token = p_token and ses_eventtype <> 'LOGOUT';
      EXCEPTION
         WHEN NO_DATA_FOUND THEN
               RAISE_APPLICATION_ERROR(-20201, 'Invalid Token');
      END;

      l_now_epoch := TRUNC(
          (CAST(SYSTIMESTAMP AT TIME ZONE 'UTC' AS DATE) - DATE '1970-01-01') * 86400);

      IF l_expires <= l_now_epoch THEN
         RAISE_APPLICATION_ERROR(-20201, 'Invalid token');
      END IF;

            -- Convert "now" to epoch seconds
      l_now_epoch := TRUNC(
         (CAST(SYSTIMESTAMP AT TIME ZONE 'UTC' AS DATE) - DATE '1970-01-01') * 86400
      );

      UPDATE sessions
      SET ses_expiresat = l_now_epoch ,
         ses_eventtype = 'LOGOUT'
      WHERE ses_token = p_token;

   END logout;

      --------------------------------------------------------------------
   --  Private helper: ensure the GUEST user exists
   --------------------------------------------------------------------
   PROCEDURE ensure_guest_user IS
      v_count INTEGER;
   BEGIN
      SELECT COUNT(*)
      INTO v_count
      FROM users
      WHERE user_id = 0;

      IF v_count = 0 THEN
         INSERT INTO users (
            user_id,
            user_firstname,
            user_lastname,
            user_username,
            user_email,
            user_passwordhash,
            user_role,
            user_startdate,
            user_isactive
         )
         VALUES (
            0,
            'Guest',
            'User',
            'GUEST',
            'guest@example.com',
            'NO_PASSWORD',     -- or a hash if you prefer
            'GUEST',
            SYSTIMESTAMP,
            'Y'
         );

      END IF;
   EXCEPTION
      WHEN OTHERS THEN
         RAISE_APPLICATION_ERROR(-20999, 'Failed to ensure GUEST user: ' || SQLERRM);
   END ensure_guest_user;

   --------------------------------------------------------------------
   --  Your other package procedures/functions go here
   --------------------------------------------------------------------


BEGIN
   --------------------------------------------------------------------
   -- Package initialization section (runs once per session)
   --------------------------------------------------------------------
   ensure_guest_user;


END auth_pkg;
/