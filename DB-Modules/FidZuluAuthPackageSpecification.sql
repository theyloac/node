CREATE OR REPLACE PACKAGE auth_pkg AS
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
    ) RETURN NUMBER;

    ------------------------------------------------------------------
    -- Login user (guest or normal)
    ------------------------------------------------------------------
    FUNCTION login_user (
        p_email    IN  VARCHAR2,
        p_password IN  VARCHAR2,
        p_ip       IN  VARCHAR2,
        p_user_id  OUT users.user_id%TYPE,
        p_role     OUT users.user_role%TYPE
    ) RETURN VARCHAR2;

    ------------------------------------------------------------------
    -- Get user details from user ID
    ------------------------------------------------------------------
    PROCEDURE getUserFromID (
         p_user_id IN NUMBER,
         p_firstname OUT VARCHAR2,
         p_lastname OUT VARCHAR2,
         p_username OUT VARCHAR2,
         p_email OUT VARCHAR2,
         p_role OUT VARCHAR2
    );

    ------------------------------------------------------------------
    -- Refresh token
    ------------------------------------------------------------------
    FUNCTION refresh_token (
         p_old_token IN VARCHAR2,
         event IN VARCHAR2 DEFAULT 'REFRESH'
    ) RETURN VARCHAR2;

     ------------------------------------------------------------------
     -- Varify token
     -- Returns TRUE if token exists and is not expired
     -- OUT parameters are populated only when valid
     ------------------------------------------------------------------
     FUNCTION verify_token (
          p_token          IN  VARCHAR2,
          p_event          OUT VARCHAR2,
          p_user_id        OUT users.user_id%TYPE,
          p_role           OUT users.user_role%TYPE,
          p_ses_expiredate OUT NUMBER
     ) RETURN BOOLEAN;

    ------------------------------------------------------------------
    -- Logout
    ------------------------------------------------------------------
    PROCEDURE logout(p_token IN VARCHAR2);

end auth_pkg;
/