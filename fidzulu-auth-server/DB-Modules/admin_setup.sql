GRANT EXECUTE ON SYS.DBMS_CRYPTO TO SYSTEM;


SET SERVEROUTPUT ON;

DECLARE
    v_token VARCHAR2(4000);
    v_user_id NUMBER;
    v_role VARCHAR2(50);
BEGIN
    -- We are passing NULL for email and password to trigger your GUEST login logic
    v_token := auth_pkg.login_user(
        p_email => NULL,
        p_password => NULL,
        p_ip => '127.0.0.1',
        p_user_id => v_user_id,
        p_role => v_role
    );
    
    DBMS_OUTPUT.PUT_LINE('--- IT WORKS! ---');
    DBMS_OUTPUT.PUT_LINE('Assigned Role: ' || v_role);
    DBMS_OUTPUT.PUT_LINE('Generated JWT: ' || v_token);
END;