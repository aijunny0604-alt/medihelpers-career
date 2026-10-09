import React, { useEffect, useState } from 'react';
import { fieldValidationLabel, fieldValidationMessage } from './formValidation.js';

export default function FormValidationNotice() {
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    let frame;
    const refresh = (form, move = false) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!form?.isConnected) return setNotice(null);
        const fields = [...form.querySelectorAll('input,select,textarea,[aria-invalid="true"]')]
          .filter(el => !el.disabled && (el.getAttribute('aria-invalid') === 'true' || (el.willValidate && !el.validity.valid)));
        if (!fields.length) return setNotice(null);
        const first = fields.find(el => el.getBoundingClientRect().height > 1) || fields[0];
        setNotice({ title: `${fields.length}개 항목을 수정해주세요`, errors: fields.map(field => ({ label: fieldValidationLabel(field), message: fieldValidationMessage(field) })) });
        if (move) { first.scrollIntoView({ behavior:'instant', block:'center' }); first.focus({ preventScroll:true }); }
      });
    };
    const invalid = event => {
      const form = event.target.form;
      if (!form) return;
      event.preventDefault();
      form.dataset.validationAttempted = 'true';
      refresh(form, true);
    };
    const submit = event => {
      event.target.dataset.validationAttempted = 'true';
      refresh(event.target, true);
    };
    const edit = event => {
      const form = event.target.form;
      if (form?.dataset.validationAttempted) refresh(form);
    };
    document.addEventListener('invalid', invalid, true);
    document.addEventListener('submit', submit, true);
    document.addEventListener('input', edit, true);
    document.addEventListener('change', edit, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('invalid', invalid, true);
      document.removeEventListener('submit', submit, true);
      document.removeEventListener('input', edit, true);
      document.removeEventListener('change', edit, true);
    };
  }, []);
  return notice && <aside className="validation-notice" role="alert"><div><strong>{notice.title}</strong><ul>{notice.errors.map((error, index) => <li key={index}><b>{error.label}</b> — {error.message}</li>)}</ul></div><button type="button" aria-label="입력 안내 닫기" onClick={() => setNotice(null)}>×</button></aside>;
}
