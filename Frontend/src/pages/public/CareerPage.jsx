import { useState } from 'react';
import toast from 'react-hot-toast';
import { submitCareerApplication } from '../../api/careerApi';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  city: '',
  qualification: '',
  subjects: '',
  teachingInterest: '',
  experience: 'fresher',
  availability: 'flexible',
  preferredMode: 'offline',
  currentOccupation: '',
  expectedPay: '',
  message: '',
};

export default function CareerPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const update = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.name || !form.email || !form.phone || !form.qualification || !form.teachingInterest) {
      setError('Please fill all required fields.');
      return;
    }

    try {
      setLoading(true);
      await submitCareerApplication({
        ...form,
        subjects: form.subjects
          .split(',')
          .map((subject) => subject.trim())
          .filter(Boolean),
      });
      setSubmitted(true);
      setForm(initialForm);
      toast.success('Application submitted');
    } catch (err) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='bg-slate-50 min-h-screen py-10 px-4'>
      <div className='mx-auto max-w-5xl'>
        <div className='mb-8'>
          <p className='text-sm font-semibold text-amber-700'>Careers</p>
          <h1 className='mt-2 text-3xl font-bold text-slate-900'>
            Teach, mentor, or support focused learners
          </h1>
          <p className='mt-3 max-w-2xl text-slate-600'>
            Share your teaching interest, free time, subjects, and experience.
            Our admin team will review your details and contact you if there is a fit.
          </p>
        </div>

        <div className='grid gap-6 lg:grid-cols-[1fr_330px]'>
          <form onSubmit={handleSubmit} className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'>
            {submitted && (
              <div className='mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700'>
                Your application has been submitted successfully.
              </div>
            )}
            {error && (
              <div className='mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
                {error}
              </div>
            )}

            <div className='grid gap-4 sm:grid-cols-2'>
              <Field label='Full name *' name='name' value={form.name} onChange={update} />
              <Field label='Email *' type='email' name='email' value={form.email} onChange={update} />
              <Field label='Phone number *' name='phone' value={form.phone} onChange={update} maxLength='10' />
              <Field label='City' name='city' value={form.city} onChange={update} />
              <Field label='Highest qualification *' name='qualification' value={form.qualification} onChange={update} placeholder='B.Tech, M.Sc, B.Ed, UPSC aspirant...' />
              <Field label='Subjects you can teach' name='subjects' value={form.subjects} onChange={update} placeholder='Maths, Physics, Reasoning' />

              <label className='grid gap-1 text-sm font-medium text-slate-700'>
                Teaching interest *
                <select name='teachingInterest' value={form.teachingInterest} onChange={update}>
                  <option value=''>Select interest</option>
                  <option value='Academic subjects'>Academic subjects</option>
                  <option value='Competitive exam mentoring'>Competitive exam mentoring</option>
                  <option value='Doubt solving'>Doubt solving</option>
                  <option value='Spoken English / communication'>Spoken English / communication</option>
                  <option value='Library operations support'>Library operations support</option>
                </select>
              </label>

              <label className='grid gap-1 text-sm font-medium text-slate-700'>
                Experience
                <select name='experience' value={form.experience} onChange={update}>
                  <option value='fresher'>Fresher</option>
                  <option value='less_than_1_year'>Less than 1 year</option>
                  <option value='1_to_3_years'>1 to 3 years</option>
                  <option value='3_plus_years'>3+ years</option>
                </select>
              </label>

              <label className='grid gap-1 text-sm font-medium text-slate-700'>
                Free time / availability
                <select name='availability' value={form.availability} onChange={update}>
                  <option value='morning'>Morning</option>
                  <option value='afternoon'>Afternoon</option>
                  <option value='evening'>Evening</option>
                  <option value='weekend'>Weekend</option>
                  <option value='flexible'>Flexible</option>
                </select>
              </label>

              <label className='grid gap-1 text-sm font-medium text-slate-700'>
                Preferred mode
                <select name='preferredMode' value={form.preferredMode} onChange={update}>
                  <option value='offline'>Offline</option>
                  <option value='online'>Online</option>
                  <option value='hybrid'>Hybrid</option>
                </select>
              </label>

              <Field label='Current occupation' name='currentOccupation' value={form.currentOccupation} onChange={update} placeholder='Student, teacher, working professional...' />
              <Field label='Expected pay' name='expectedPay' value={form.expectedPay} onChange={update} placeholder='Optional' />
            </div>

            <label className='mt-4 grid gap-1 text-sm font-medium text-slate-700'>
              Why do you want to join us?
              <textarea
                name='message'
                value={form.message}
                onChange={update}
                rows='5'
                className='rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-amber-500'
                placeholder='Tell us about your teaching style, strengths, and preferred batches.'
              />
            </label>

            <button
              type='submit'
              disabled={loading}
              className='mt-6 rounded-lg bg-[#11182B] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1B2540] disabled:opacity-60'
            >
              {loading ? 'Submitting...' : 'Submit application'}
            </button>
          </form>

          <aside className='rounded-2xl border border-slate-200 bg-white p-6 shadow-sm h-fit'>
            <h2 className='text-lg font-semibold text-slate-900'>What we review</h2>
            <ul className='mt-4 space-y-3 text-sm text-slate-600'>
              <li>Subjects and exam areas you can teach.</li>
              <li>Your free time and preferred teaching mode.</li>
              <li>Qualification, experience, and communication ability.</li>
              <li>Whether you can support library students consistently.</li>
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <label className='grid gap-1 text-sm font-medium text-slate-700'>
      {label}
      <input
        {...props}
        className='rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-amber-500'
      />
    </label>
  );
}
