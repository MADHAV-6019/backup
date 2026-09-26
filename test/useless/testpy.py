def create_join(session, invite: str, context: str, rqtoken: str = None, captcha: bool = False) -> Union[bool, response.Response]:

    session.headers.update({"x-context-properties": context})
    session.headers.update({"referer": "https://discord.com/invite/"+invite})
    if captcha:
        session.headers.update({"x-captcha-key": captcha})
        session.headers.update({"x-captcha-rqtoken": rqtoken})
    js = {
        "session_id": (''.join(random.sample(string.ascii_lowercase+string.digits,32))),
    }

    req = session.post(f"https://discord.com/api/v9/invites/{invite}", json=js, )
    return req.status_code == 200, req    