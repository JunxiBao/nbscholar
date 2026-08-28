from flask import g
def test():
    g.user_id = 123
    print(g.user_id)
