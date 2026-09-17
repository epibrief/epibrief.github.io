/* 예시 소식지 6종 — 고르면 독자·문체·구성·색상이 함께 준비됩니다.
   예시에는 실제 기관의 발간물처럼 보이는 기관명·로고를 쓰지 않고,
   확인하지 않은 날짜·진료시간·전화번호를 사실처럼 채우지 않습니다. */
(function (w) {
  'use strict';
  var seq = 0;
  function uid(p) { seq += 1; return (p || 'b') + Date.now().toString(36).slice(-4) + seq.toString(36); }
  function B(o) { o.id = uid(); if (o.sample === undefined) o.sample = true; return o; }

  var TODO_ROW = function (what, when, where, note) {
    return { what: what, when: when, where: where, note: note, todo: true };
  };

  var T = [
    {
      id: 'local', name: '우리 동네 건강소식', who: '보건소 · 지자체', reader: '주민용',
      desc: '건강안내 · 기관 소식 · 일정 · 문의', tone: '쉬운 존댓말',
      kind: 'local', tpl: 'card',
      make: function () {
        return {
          kind: 'local', tpl: 'card', kindName: '우리 동네 건강소식',
          title: '우리 동네 건강소식', issue: '2026년 제1호', lead: '이번 달 꼭 챙기셨으면 하는 건강 정보와 일정을 모았습니다.',
          org: { name: '', dept: '', editor: '', contact: '', logo: '', credit: '' },
          blocks: [
            B({ type: 'notice', title: '이달의 건강안내', body:
              '환절기에는 일교차가 커서 호흡기 질환에 걸리기 쉽습니다.\n외출 뒤 손 씻기, 실내 환기, 기침 예절 세 가지만 지켜도 감염 위험을 줄일 수 있습니다.\n\n(이 문단을 우리 기관 안내로 바꿔 주세요.)',
              srcName: '질병관리청 감염병 예방수칙', srcUrl: 'https://www.kdca.go.kr/' }),
            B({ type: 'notice', title: '보건소 소식', body:
              '이 자리에 이번 달 기관 소식을 적어 주세요. 새로 시작하는 사업, 달라진 이용 방법, 주민께 알릴 변경 사항 등이 들어갑니다.',
              srcName: '', srcUrl: '' }),
            B({ type: 'schedule', title: '이달의 일정', rows: [
              TODO_ROW('예시 일정 — 실제 일정으로 바꿔 주세요', '날짜 입력', '장소 입력', '대상·신청 방법 입력'),
              TODO_ROW('예시 일정 — 실제 일정으로 바꿔 주세요', '날짜 입력', '장소 입력', '')
            ] }),
            B({ type: 'contact', title: '문의', items: [
              '대표전화 · 번호를 입력해 주세요',
              '방문 · 주소와 운영시간을 입력해 주세요'
            ] })
          ]
        };
      }
    },
    {
      id: 'phsm', name: '감염병 사회 대응 PHSM 브리프', who: '전문가 · 실무자', reader: '전문가용',
      desc: '정책 질문 · 핵심 근거 · 한계 · 국내 적용 · 토론거리', tone: '개조식 문어체',
      kind: 'phsm', tpl: 'brief',
      make: function () {
        return {
          kind: 'phsm', tpl: 'brief', kindName: '감염병 사회 대응(PHSM) 브리프',
          title: '감염병 사회 대응 브리프', issue: '2026년 제1호',
          lead: '이번 호는 사회적 조치의 효과와 한계를 다룹니다. 요약은 초안이며 원문 확인 뒤 사용하십시오.',
          org: { name: '', dept: '', editor: '', contact: '', logo: '', credit: '' },
          blocks: [
            B({ type: 'question', title: '이번 호의 정책 질문', body:
              '이번 호에서 답하려는 정책 질문을 한 문장으로 적어 주세요.\n예) 실내 마스크 권고를 의무로 되돌릴 때 어떤 근거와 조건이 필요한가?' }),
            B({ type: 'evidence', title: '핵심 근거', items: [
              { title: '예시 근거 1 — 연구 제목을 넣어 주세요', who: '연구 대상을 입력해 주세요',
                design: '연구 설계를 입력해 주세요 (관찰연구 · 무작위배정 · 모형 등)',
                result: '결과를 원문에서 확인해 입력해 주세요. 수치는 분모와 기간을 함께 적습니다.',
                limit: '한계를 입력해 주세요 (표본·기간·교란요인 등)',
                url: '', srcType: '학술논문', checked: false },
              { title: '예시 근거 2 — 기관 발표 자료를 넣어 주세요', who: '대상을 입력해 주세요',
                design: '자료 종류를 입력해 주세요 (감시자료 · 지침 · 보고서)',
                result: '발표 내용을 입력해 주세요.',
                limit: '기관 공식자료라도 정책 효과의 근거 확실성이 자동으로 높아지지는 않습니다.',
                url: '', srcType: '기관 발표', checked: false }
            ] }),
            B({ type: 'list', title: '국내 적용 시 검토할 점', items: [
              '국내 감시자료로 같은 지표를 만들 수 있는지 확인할 것',
              '조치 강도와 사회·경제적 부담을 함께 놓고 볼 것'
            ] }),
            B({ type: 'list', title: '실무자에게 묻는 토론 질문', items: [
              '현장에서 가장 먼저 막히는 지점은 무엇입니까?',
              '이 근거만으로 지침을 바꿀 수 있습니까, 무엇이 더 필요합니까?'
            ] })
          ]
        };
      }
    },
    {
      id: 'epi', name: '감염병·보건 동향', who: '시도 · 지원단 · 보건소 실무자', reader: '실무자용',
      desc: '동향 · 지침 변경 · 업무 참고 · 원문', tone: '간결한 실무체',
      kind: 'epi', tpl: 'brief',
      make: function () {
        return {
          kind: 'epi', tpl: 'brief', kindName: '감염병·보건 동향',
          title: '감염병·보건 동향', issue: '2026년 제1호',
          lead: '이번 호에서 실무에 바로 영향을 주는 변화만 추렸습니다.',
          org: { name: '', dept: '', editor: '', contact: '', logo: '', credit: '' },
          blocks: [
            B({ type: 'notice', title: '이번 호 동향', body:
              '이번 기간의 발생 동향과 눈에 띄는 변화를 적어 주세요.\n[공개 자료에서 가져오기]로 기관 발표와 논문을 불러올 수 있습니다.',
              srcName: '', srcUrl: '' }),
            B({ type: 'list', title: '지침·공지 변경', items: [
              '바뀐 지침과 시행일을 적어 주세요',
              '이전 판과 달라진 점만 짧게 적습니다'
            ] }),
            B({ type: 'list', title: '업무에 참고할 점', items: [
              '우리 기관에서 당장 해야 할 일',
              '다음 회의에서 확인할 사항'
            ] }),
            B({ type: 'notice', title: '원문 보기', body: '인용한 자료의 원문 주소를 함께 남겨 주세요.',
              srcName: '', srcUrl: '' })
          ]
        };
      }
    },
    {
      id: 'campus', name: '캠퍼스 건강레터', who: '대학', reader: '학생 · 교직원용',
      desc: '건강안내 · 상담/검진 · 프로그램 · 신청', tone: '친근한 존댓말',
      kind: 'campus', tpl: 'card',
      make: function () {
        return {
          kind: 'campus', tpl: 'card', kindName: '캠퍼스 건강레터',
          title: '캠퍼스 건강레터', issue: '2026년 제1호',
          lead: '학기 중 챙기면 좋은 건강 정보와 교내 프로그램을 모았습니다.',
          org: { name: '', dept: '', editor: '', contact: '', logo: '', credit: '' },
          blocks: [
            B({ type: 'notice', title: '이번 달 건강안내', body:
              '시험 기간 수면과 카페인, 기숙사 생활 감염 예방처럼 학생들이 바로 쓸 수 있는 내용을 적어 주세요.',
              srcName: '', srcUrl: '' }),
            B({ type: 'schedule', title: '상담 · 검진 일정', rows: [
              TODO_ROW('예시 일정 — 실제 일정으로 바꿔 주세요', '날짜 입력', '장소 입력', '대상 입력')
            ] }),
            B({ type: 'list', title: '이번 학기 프로그램', items: [
              '프로그램 이름과 간단한 소개',
              '모집 인원과 모집 기간'
            ] }),
            B({ type: 'notice', title: '신청 방법', body: '신청 경로를 적어 주세요. 온라인 신청 주소가 있으면 아래 출처 칸에 넣으면 됩니다.',
              srcName: '', srcUrl: '' })
          ]
        };
      }
    },
    {
      id: 'hospital', name: '병원 건강레터', who: '병원', reader: '환자 · 보호자용',
      desc: '쉬운 건강정보 · 교육/이용안내 · 문의', tone: '쉬운 존댓말',
      kind: 'hospital', tpl: 'card',
      make: function () {
        return {
          kind: 'hospital', tpl: 'card', kindName: '병원 건강레터',
          title: '건강레터', issue: '2026년 제1호',
          lead: '환자분과 보호자께 도움이 될 내용을 쉬운 말로 정리했습니다.',
          org: { name: '', dept: '', editor: '', contact: '', logo: '', credit: '' },
          blocks: [
            B({ type: 'notice', title: '쉬운 건강정보', body:
              '전문용어는 괄호로 쉬운 풀이를 덧붙여 주세요.\n예) 고혈압(혈관에 가해지는 압력이 높은 상태)',
              srcName: '', srcUrl: '' }),
            B({ type: 'list', title: '환자 교육 프로그램', items: [
              '프로그램 이름 · 대상 · 진행 방식',
              '참여 방법을 적어 주세요'
            ] }),
            B({ type: 'list', title: '이용 안내', items: [
              '진료시간과 휴진일은 반드시 확인한 값을 넣어 주세요',
              '주차 · 방문 절차 등 달라진 점'
            ] }),
            B({ type: 'contact', title: '문의', items: [
              '대표전화 · 번호를 입력해 주세요',
              '상담 창구 · 위치를 입력해 주세요'
            ] })
          ]
        };
      }
    },
    {
      id: 'research', name: '연구·기관 소식', who: '대학 · 병원 · 학회 · 관련 기관', reader: '동료 · 회원용',
      desc: '연구/사업 소식 · 행사 · 자료 · 연락처', tone: '단정한 문어체',
      kind: 'research', tpl: 'brief',
      make: function () {
        return {
          kind: 'research', tpl: 'brief', kindName: '연구·기관 소식',
          title: '연구·기관 소식', issue: '2026년 제1호',
          lead: '이번 호의 연구·사업 진행 상황과 다가오는 일정을 전합니다.',
          org: { name: '', dept: '', editor: '', contact: '', logo: '', credit: '' },
          blocks: [
            B({ type: 'notice', title: '연구 · 사업 소식', body:
              '진행 중인 과제의 상황, 새로 시작한 사업, 발표한 논문 등을 적어 주세요.',
              srcName: '', srcUrl: '' }),
            B({ type: 'schedule', title: '행사 일정', rows: [
              TODO_ROW('예시 일정 — 실제 일정으로 바꿔 주세요', '날짜 입력', '장소 입력', '등록 방법 입력')
            ] }),
            B({ type: 'list', title: '자료 · 발간물', items: [
              '자료 이름과 받는 곳을 적어 주세요',
              '원문 주소가 있으면 함께 남깁니다'
            ] }),
            B({ type: 'contact', title: '연락처', items: [
              '담당 · 이름과 연락처를 입력해 주세요'
            ] })
          ]
        };
      }
    }
  ];

  /* 예시 카드용 — 기관 자리에 자리표시자를 넣고 예시임을 표시합니다 */
  function demoDoc(t) {
    var d = t.make();
    d.demo = true;
    d.kindName = 'EpiBrief 제공 · 예시 뉴스레터';
    d.issue = '2026년 제1호';
    d.date = '';
    d.org.name = '○○기관';
    d.org.dept = '○○과';
    d.org.editor = '담당자 이름';
    d.org.contact = '연락처를 입력해 주세요';
    return d;
  }

  w.EpiTemplates = { list: T, byId: function (id) { return T.filter(function (x) { return x.id === id; })[0]; }, demoDoc: demoDoc, uid: uid };
})(window);
