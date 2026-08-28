"""SQLAlchemy 数据模型"""
from datetime import datetime
from extensions import db


class User(db.Model):
    __tablename__ = 'users'

    id          = db.Column(db.Integer, primary_key=True)
    account     = db.Column(db.String(120), unique=True, nullable=False, index=True)  # 手机号/邮箱
    password    = db.Column(db.String(255), nullable=False)
    name        = db.Column(db.String(60), default='')
    institution = db.Column(db.String(120), default='')
    age         = db.Column(db.Integer, nullable=True)
    gender      = db.Column(db.String(10), default='')
    avatar_url  = db.Column(db.String(500), default='')
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    # 关系
    histories   = db.relationship('SearchHistory', backref='user', lazy='dynamic',
                                  cascade='all, delete-orphan')
    favorites   = db.relationship('Favorite', backref='user', lazy='dynamic',
                                  cascade='all, delete-orphan')
    enrollments = db.relationship('Enrollment', backref='user', lazy='dynamic',
                                  cascade='all, delete-orphan')
    chat_sessions = db.relationship('ChatSession', backref='user', lazy='dynamic',
                                    cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id':          self.id,
            'account':     self.account,
            'name':        self.name,
            'institution': self.institution,
            'age':         self.age,
            'gender':      self.gender,
            'avatar_url':  self.avatar_url,
        }


class Paper(db.Model):
    """文献元数据（本地缓存/mock 数据）"""
    __tablename__ = 'papers'

    id          = db.Column(db.Integer, primary_key=True)
    title       = db.Column(db.String(500), nullable=False)
    authors     = db.Column(db.Text, default='')          # JSON 字符串
    abstract    = db.Column(db.Text, default='')
    journal     = db.Column(db.String(300), default='')
    year        = db.Column(db.Integer, nullable=True)
    doi         = db.Column(db.String(200), default='')
    pmid        = db.Column(db.String(50), default='')
    source      = db.Column(db.String(50), default='')    # arxiv/知网/pubmed 等
    doc_type    = db.Column(db.String(50), default='')    # 研究论文/综述/学位论文
    impact_factor = db.Column(db.Float, nullable=True)
    citations   = db.Column(db.Integer, default=0)
    url         = db.Column(db.String(500), default='')
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':             self.id,
            'title':          self.title,
            'authors':        self.authors,
            'abstract':       self.abstract,
            'journal':        self.journal,
            'year':           self.year,
            'doi':            self.doi,
            'pmid':           self.pmid,
            'source':         self.source,
            'doc_type':       self.doc_type,
            'impact_factor':  self.impact_factor,
            'citations':      self.citations,
            'url':            self.url,
        }


class SearchHistory(db.Model):
    __tablename__ = 'search_history'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    keyword    = db.Column(db.String(300), nullable=False)
    source     = db.Column(db.String(100), default='')
    result_cnt = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':         self.id,
            'keyword':    self.keyword,
            'source':     self.source,
            'result_cnt': self.result_cnt,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M'),
        }


class Favorite(db.Model):
    __tablename__ = 'favorites'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    paper_id   = db.Column(db.Integer, db.ForeignKey('papers.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    paper      = db.relationship('Paper')

    __table_args__ = (
        db.UniqueConstraint('user_id', 'paper_id', name='uq_user_paper'),
    )

    def to_dict(self):
        d = self.paper.to_dict()
        d['favorite_id']  = self.id
        d['favorited_at'] = self.created_at.strftime('%Y-%m-%d %H:%M')
        return d


class Journal(db.Model):
    __tablename__ = 'journals'

    id           = db.Column(db.Integer, primary_key=True)
    name         = db.Column(db.String(300), nullable=False)
    publisher    = db.Column(db.String(200), default='')
    impact_factor = db.Column(db.Float, nullable=True)
    quartile     = db.Column(db.String(10), default='')   # Q1/Q2/Q3/Q4
    field        = db.Column(db.String(100), default='')  # 医学生命/计算机等
    review_weeks = db.Column(db.String(50), default='')
    page_charge  = db.Column(db.String(100), default='')  # 版面费说明
    open_access  = db.Column(db.Boolean, default=False)
    url          = db.Column(db.String(500), default='')
    logo_char    = db.Column(db.String(10), default='')   # 期刊首字母/emoji

    def to_dict(self):
        return {
            'id':            self.id,
            'name':          self.name,
            'publisher':     self.publisher,
            'impact_factor': self.impact_factor,
            'quartile':      self.quartile,
            'field':         self.field,
            'review_weeks':  self.review_weeks,
            'page_charge':   self.page_charge,
            'open_access':   self.open_access,
            'url':           self.url,
            'logo_char':     self.logo_char,
        }


class TrainingEvent(db.Model):
    __tablename__ = 'training_events'

    id           = db.Column(db.Integer, primary_key=True)
    title        = db.Column(db.String(300), nullable=False)
    speaker      = db.Column(db.String(100), default='')
    affiliation  = db.Column(db.String(200), default='')
    event_date   = db.Column(db.DateTime, nullable=False)
    end_time     = db.Column(db.DateTime, nullable=True)
    location     = db.Column(db.String(200), default='')
    event_type   = db.Column(db.String(50), default='')   # 线上/线下/录播
    platform     = db.Column(db.String(100), default='')  # Zoom/腾讯会议
    capacity     = db.Column(db.Integer, default=100)
    enrolled_cnt = db.Column(db.Integer, default=0)
    description  = db.Column(db.Text, default='')
    color        = db.Column(db.String(20), default='#2563EB')
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

    enrollments  = db.relationship('Enrollment', backref='event', lazy='dynamic',
                                   cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id':           self.id,
            'title':        self.title,
            'speaker':      self.speaker,
            'affiliation':  self.affiliation,
            'event_date':   self.event_date.strftime('%Y-%m-%d %H:%M'),
            'end_time':     self.end_time.strftime('%H:%M') if self.end_time else '',
            'location':     self.location,
            'event_type':   self.event_type,
            'platform':     self.platform,
            'capacity':     self.capacity,
            'enrolled_cnt': self.enrolled_cnt,
            'description':  self.description,
            'color':        self.color,
        }


class Enrollment(db.Model):
    __tablename__ = 'enrollments'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    event_id   = db.Column(db.Integer, db.ForeignKey('training_events.id'), nullable=False)
    status     = db.Column(db.String(20), default='enrolled')  # enrolled/cancelled/attended
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('user_id', 'event_id', name='uq_user_event'),
    )

    def to_dict(self):
        return {
            'id':         self.id,
            'event_id':   self.event_id,
            'status':     self.status,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M'),
        }


class ChatSession(db.Model):
    __tablename__ = 'chat_sessions'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    title      = db.Column(db.String(100), default='新对话')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    messages   = db.relationship('ChatMessage', backref='session', lazy='dynamic',
                                 cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id':         self.id,
            'title':      self.title,
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M'),
        }


class ChatMessage(db.Model):
    __tablename__ = 'chat_messages'

    id         = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('chat_sessions.id'), nullable=False, index=True)
    role       = db.Column(db.String(20), nullable=False)  # user 或 assistant
    content    = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':         self.id,
            'role':       self.role,
            'content':    self.content,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M'),
        }


class AdminUser(db.Model):
    __tablename__ = 'admin_users'

    id          = db.Column(db.Integer, primary_key=True)
    account     = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password    = db.Column(db.String(255), nullable=False)
    role        = db.Column(db.String(20), default='admin') # super_admin or admin
    status      = db.Column(db.String(20), default='pending') # pending, approved, rejected
    name        = db.Column(db.String(60), default='')
    remark      = db.Column(db.String(500), default='')
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':         self.id,
            'account':    self.account,
            'role':       self.role,
            'status':     self.status,
            'name':       self.name,
            'remark':     self.remark,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M'),
        }

