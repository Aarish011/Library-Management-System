import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import razorpayLogo from '../../assets/images/payment/razorpay-logo.png';
import payOnDeskIcon from '../../assets/images/payment/pay-on-desk-icon.png';
import {
  LOCKER_DEPOSIT,
  LOCKER_RENT,
  PLANS,
  computePrice,
  getPlan,
} from '../../utils/plansConfig';
import toast from 'react-hot-toast';
import {
  createDeskReference,
  createRazorpayOrder,
  getAvailableLockers,
  getPaymentHistory,
  verifyRazorpayPayment,
} from '../../api/paymentApi';
import { getActiveReservation } from '../../api/reservationApi';
import { getActiveSubscription } from '../../api/subscriptionApi';
import useActionCooldown from '../../hooks/useActionCooldown';
import InstitutePolicyNotice from '../../components/common/InstitutePolicyNotice';

export default function PaymentPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const paymentCooldown = useActionCooldown(10000);
  const selectedPlan = state?.selectedPlan || null;
  const [payments, setPayments] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingReservation, setLoadingReservation] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState(
    selectedPlan?.plan || ''
  );
  const [lockerSelected, setLockerSelected] = useState(
    Boolean(state?.lockerSelected)
  );
  const [selectedLockerNumber, setSelectedLockerNumber] = useState(
    state?.lockerNumber || ''
  );
  const [lockers, setLockers] = useState([]);
  const [loadingLockers, setLoadingLockers] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(
    state?.selectedSlot || state?.reservation?.slot || ''
  );
  const [processing, setProcessing] = useState('');
  const [deskReference, setDeskReference] = useState(null);
  const [error, setError] = useState('');
  const [activeSubscription, setActiveSubscription] = useState(null);
  const [reservationHold, setReservationHold] = useState(() => {
    if (!state?.reservation && !state?.seat) return null;
    return {
      reservation: state?.reservation || null,
      seat: state?.seat || null,
      reservedUntil:
        state?.reservedUntil || state?.reservation?.reservedUntil || null,
      timeLeft: state?.timeLeft ?? null,
    };
  });

  const plan = useMemo(
    () => selectedPlan || getPlan(selectedPlanId),
    [selectedPlan, selectedPlanId]
  );
  const hasLockerRent = plan?.plan === 'library_access';
  const lockerDepositAlreadyPaid =
    lockerSelected && Boolean(activeSubscription?.lockerSelected);
  const totalAmount =
    computePrice(plan, lockerSelected, selectedSlot) -
    (lockerDepositAlreadyPaid ? LOCKER_DEPOSIT : 0);
  const hasMatchingSeatHold = useMemo(() => {
    if (plan && !plan.reservesSeat) return true;
    if (!plan || !reservationHold?.seat || !reservationHold?.reservation) {
      return false;
    }

    const seatNumber = Number(reservationHold.seat.seatNumber);
    const [minimumSeat, maximumSeat] = plan.allowedSeatRange || [];
    const reservationPlan = reservationHold.reservation.plan;
    const reservationSlot = reservationHold.reservation.slot || 'full_day';
    const requiredSlot = plan.plan === 'library_access' ? selectedSlot : 'full_day';
    const planMatches = !reservationPlan || reservationPlan === plan.plan;
    const slotMatches = reservationSlot === requiredSlot;
    const rangeMatches =
      seatNumber >= minimumSeat && seatNumber <= maximumSeat;
    const holdIsUsable =
      reservationHold.reservation.status === 'confirmed' ||
      (reservationHold.reservation.status === 'active' &&
        reservationHold.timeLeft !== 0);

    return planMatches && slotMatches && rangeMatches && holdIsUsable;
  }, [plan, reservationHold, selectedSlot]);

  const isSeatBooked =
    reservationHold?.reservation?.status === 'confirmed' ||
    reservationHold?.seat?.status === 'booked';
  const canRenewActiveSubscription =
    Boolean(activeSubscription && plan) &&
    activeSubscription.plan === plan.plan &&
    new Date(activeSubscription.endDate).getTime() - Date.now() <=
      2 * 24 * 60 * 60 * 1000;
  const reservationDeadline =
    reservationHold?.reservedUntil ||
    reservationHold?.reservation?.reservedUntil ||
    null;
  const lockersSoldOut =
    lockerSelected &&
    !loadingLockers &&
    lockers.length > 0 &&
    lockers.every(
      (locker) =>
        locker.status === 'occupied' && !locker.assignedToCurrentUser
    );
  const lockerSelectionMissing = lockerSelected && !selectedLockerNumber;

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await getPaymentHistory();
      setPayments(response.success ? response.data || [] : []);
    } catch (err) {
      setError(err.message || 'Failed to load payment history');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();

    let ignore = false;
    getActiveReservation()
      .then((response) => {
        if (!ignore && response.success && response.data) {
          setReservationHold({
            ...response.data,
            reservedUntil:
              response.data.reservedUntil ||
              response.data.reservation?.reservedUntil ||
              null,
          });
          if (response.data.reservation?.slot) {
            setSelectedSlot(response.data.reservation.slot);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!ignore) setLoadingReservation(false);
      });

    getActiveSubscription()
      .then((response) => {
        if (!ignore && response.success && response.data?.subscription) {
          setActiveSubscription(response.data.subscription);
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!lockerSelected) {
      setSelectedLockerNumber('');
      return undefined;
    }

    let ignore = false;
    setLoadingLockers(true);
    getAvailableLockers()
      .then((response) => {
        if (!ignore && response.success) {
          const lockerList = response.data || [];
          setLockers(lockerList);
          const ownLocker = lockerList.find(
            (locker) => locker.assignedToCurrentUser
          );
          if (ownLocker && !selectedLockerNumber) {
            setSelectedLockerNumber(ownLocker.lockerNumber);
          }
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err.message || 'Failed to load locker availability');
        }
      })
      .finally(() => {
        if (!ignore) setLoadingLockers(false);
      });

    return () => {
      ignore = true;
    };
  }, [lockerSelected, selectedLockerNumber]);

  useEffect(() => {
    if (!reservationDeadline) return undefined;

    const updateTimer = () => {
      setReservationHold((current) => {
        const seconds = Math.max(
          0,
          Math.floor(
            (new Date(reservationDeadline).getTime() - Date.now()) / 1000
          )
        );

        if (
          seconds === 0 &&
          current?.reservation?.status === 'active'
        ) {
          setError(
            'Your seat hold has expired. Please select the seat again and try payment again.'
          );
        }

        return { ...current, timeLeft: seconds };
      });
    };

    updateTimer();
    const intervalId = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(intervalId);
  }, [reservationDeadline]);

  const validatePayment = () => {
    if (!plan) {
      setError('Select a plan before payment.');
      return false;
    }

    if (activeSubscription && !canRenewActiveSubscription) {
      setError(
        'Your session is active. You cannot make another payment right now. Please ask for help from the library desk if you need changes.'
      );
      return false;
    }

    if (plan.reservesSeat && !hasMatchingSeatHold) {
      setError('Select a seat for this package before making payment.');
      toast.error('Please select a seat first');
      return false;
    }

    if (plan.plan === 'library_access' && !selectedSlot) {
      setError('Select morning or evening slot before making payment.');
      return false;
    }

    if (
      reservationHold?.reservation?.status === 'active' &&
      reservationHold.timeLeft === 0
    ) {
      setError('Your seat hold expired. Please select the seat again.');
      return false;
    }

    if (lockersSoldOut) {
      setError('All lockers are sold out. You can continue booking without a locker.');
      toast.error('All lockers are sold out');
      return false;
    }

    if (lockerSelected && !selectedLockerNumber) {
      setError('Select a locker number before payment.');
      toast.error('Please select a locker');
      return false;
    }

    return true;
  };

  const handleDirectPlanSelection = (planId) => {
    setSelectedPlanId(planId);
    const nextPlan = getPlan(planId);
    if (!nextPlan) return;

    navigate('/book-seat', {
      state: { selectedPlan: nextPlan },
    });
  };

  const handleRazorpay = async () => {
    if (
      !paymentCooldown.guard((seconds) =>
        setError(`Please wait ${seconds}s before starting another payment.`)
      )
    ) {
      return;
    }

    if (!validatePayment()) return;

    try {
      setProcessing('razorpay');
      paymentCooldown.startCooldown();
      setError('');
      await loadRazorpayScript();
      const orderResponse = await createRazorpayOrder({
        plan: plan.plan,
        slot: plan.plan === 'library_access' ? selectedSlot : 'full_day',
        lockerSelected,
        lockerNumber: lockerSelected ? selectedLockerNumber : null,
      });
      const order = orderResponse.data;

      await openRazorpayCheckout({
        order,
        onSuccess: async (response) => {
          const verification = await verifyRazorpayPayment({
            paymentId: order.paymentId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });

          navigate('/payment-success', {
            state: {
              payment: verification.data.payment,
              subscription: verification.data.subscription,
            },
          });
        },
      });
    } catch (err) {
      setError(err.message || 'Razorpay payment failed. Please try again.');
    } finally {
      setProcessing('');
    }
  };

  const handlePayOnDesk = async () => {
    if (
      !paymentCooldown.guard((seconds) =>
        setError(`Please wait ${seconds}s before creating another reference.`)
      )
    ) {
      return;
    }

    if (!validatePayment()) return;

    try {
      setProcessing('desk');
      paymentCooldown.startCooldown();
      setError('');
      const response = await createDeskReference({
        plan: plan.plan,
        slot: plan.plan === 'library_access' ? selectedSlot : 'full_day',
        lockerSelected,
        lockerNumber: lockerSelected ? selectedLockerNumber : null,
      });
      setDeskReference(response.data);
      await loadHistory();
    } catch (err) {
      setError(err.message || 'Could not create desk payment reference.');
    } finally {
      setProcessing('');
    }
  };

  return (
    <div className='min-h-screen bg-slate-50 pb-12'>
      <header className='bg-[#11182B]'>
        <div className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16'>
          <h1 className='text-[26px] text-white font-semibold'>Payments</h1>
          <p className='text-[14px] text-[#9AA4C2] mt-1.5'>
            Complete your library fee payment or review your payment history.
          </p>
        </div>
      </header>

      <main className='max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6'>
        <section className='space-y-6'>
          {activeSubscription && (
            <div
              className={`rounded-2xl border p-6 text-sm shadow-sm ${
                canRenewActiveSubscription
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              <p className='font-semibold'>
                {canRenewActiveSubscription
                  ? 'Renewal payment is available'
                  : 'Your session is active'}
              </p>
              <p className='mt-1'>
                {canRenewActiveSubscription
                  ? 'Verified payment will extend your current plan by 30 days and keep your seat.'
                  : 'You cannot make another payment right now. Please ask for help from the library desk if you need changes.'}
              </p>
            </div>
          )}

          {reservationHold?.seat && (
            <div className='bg-white rounded-2xl border border-slate-200 shadow-sm p-6'>
              <div className='flex items-center justify-between gap-4'>
                <div>
                  <h2 className='text-[17px] font-semibold text-slate-900'>
                    {isSeatBooked
                      ? 'Your seat is booked'
                      : reservationHold.timeLeft === 0
                        ? 'Seat hold expired'
                        : 'Seat hold'}
                  </h2>
                  <p className='text-sm text-slate-500'>
                    {isSeatBooked
                      ? `Seat ${reservationHold.seat.seatNumber} is booked for your active subscription.`
                      : reservationHold.timeLeft === 0
                        ? `Seat ${reservationHold.seat.seatNumber} is no longer held. Please select the seat again and try payment again.`
                        : `Seat ${reservationHold.seat.seatNumber} is held while you complete payment.`}
                    {reservationHold.reservation?.slot &&
                      reservationHold.reservation.slot !== 'full_day' &&
                      ` Slot: ${formatSlot(reservationHold.reservation.slot)}.`}
                  </p>
                </div>
                {isSeatBooked ? (
                  <div className='rounded-xl bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700'>
                    Booked
                  </div>
                ) : (
                  <div
                    className={`rounded-xl px-4 py-2 text-sm font-semibold ${reservationHold.timeLeft === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}
                  >
                    {reservationHold.timeLeft === 0
                      ? 'Expired'
                      : formatTimer(reservationHold.timeLeft)}
                  </div>
                )}
              </div>
              {!isSeatBooked && reservationHold.timeLeft === 0 && (
                <button
                  type='button'
                  onClick={() =>
                    navigate('/book-seat', {
                      state: { selectedPlan: plan },
                    })
                  }
                  className='mt-4 rounded-lg bg-[#11182B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1B2540]'
                >
                  Select seat again
                </button>
              )}
            </div>
          )}

          <div className='bg-white rounded-2xl border border-slate-200 shadow-sm p-6'>
            <div className='flex items-center justify-between gap-4 mb-5'>
              <div>
                <h2 className='text-[17px] font-semibold text-slate-900'>
                  Selected package
                </h2>
                <p className='text-sm text-slate-500'>
                  Choose your monthly library fee package.
                </p>
              </div>
              <Link
                to='/subscription'
                className='text-sm font-medium text-[#946000] hover:underline'
              >
                Change package
              </Link>
            </div>

            {plan ? (
              <div className='rounded-xl border border-[#F4B740]/40 bg-[#F4B740]/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
                <div>
                  <p className='text-lg font-semibold text-slate-900'>
                    {plan.name}
                  </p>
                <p className='text-sm text-slate-600'>
                  {plan.duration} days membership - seats{' '}
                  {plan.reservesSeat
                    ? `${plan.allowedSeatRange?.[0]} to ${plan.allowedSeatRange?.[1]}`
                    : 'general area'}
                  {plan.plan === 'library_access' && selectedSlot
                    ? ` - ${formatSlot(selectedSlot)}`
                    : ''}
                </p>
                </div>
                <p className='text-2xl font-semibold text-slate-900'>
                  Rs. {totalAmount.toLocaleString('en-IN')}
                </p>
              </div>
            ) : (
              <select
                value={selectedPlanId}
                onChange={(event) =>
                  handleDirectPlanSelection(event.target.value)
                }
                className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#F4B740]'
              >
                <option value=''>Select a package</option>
                {PLANS.map((item) => (
                  <option key={item.id} value={item.plan}>
                    {item.name} - Rs. {item.price}
                  </option>
                ))}
              </select>
            )}

            {plan && (
              <>
                <label className='mt-4 flex items-start gap-3 rounded-xl border border-slate-200 p-3 cursor-pointer hover:bg-slate-50'>
                  <input
                    type='checkbox'
                    checked={lockerSelected}
                    onChange={(event) => setLockerSelected(event.target.checked)}
                    className='mt-1 h-4 w-4 accent-[#11182B]'
                  />
                  <span className='min-w-0'>
                    <span className='block text-sm font-medium text-slate-900'>
                      Add locker
                    </span>
                    <span className='block text-xs text-slate-500'>
                      {hasLockerRent
                        ? 'Optional locker rent plus refundable security. Security is not charged again when renewing the same locker.'
                        : 'Reserved seat lockers only require refundable security. There is no monthly locker rent.'}
                    </span>
                    {lockerDepositAlreadyPaid && (
                      <span className='mt-1 block text-xs font-medium text-emerald-700'>
                        Existing locker security detected. It will not be charged again.
                      </span>
                    )}
                  </span>
                </label>

                {lockerSelected && (
                  <div className='mt-4 rounded-xl border border-slate-200 p-4'>
                    <div className='mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1'>
                      <div>
                        <p className='text-sm font-semibold text-slate-900'>
                          Choose locker number
                        </p>
                        <p className='text-xs text-slate-500'>
                          Lockers 1 to 36. Occupied lockers are disabled.
                        </p>
                      </div>
                      {selectedLockerNumber && (
                        <span className='text-xs font-semibold text-emerald-700'>
                          Locker {selectedLockerNumber} selected
                        </span>
                      )}
                    </div>

                    {loadingLockers ? (
                      <div className='rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500'>
                        Loading lockers...
                      </div>
                    ) : lockersSoldOut ? (
                      <div className='rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900'>
                        <p className='font-semibold'>All lockers are sold out</p>
                        <p className='mt-1 text-amber-800'>
                          You can still book your seat or general slot without a locker.
                        </p>
                        <button
                          type='button'
                          onClick={() => {
                            setLockerSelected(false);
                            setSelectedLockerNumber('');
                            setError('');
                          }}
                          className='mt-3 rounded-lg bg-[#11182B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1B2540]'
                        >
                          Continue without locker
                        </button>
                      </div>
                    ) : (
                      <div className='grid grid-cols-6 sm:grid-cols-9 gap-2'>
                        {lockers.map((locker) => {
                          const active =
                            selectedLockerNumber === locker.lockerNumber;
                          const disabled =
                            locker.status === 'occupied' &&
                            !locker.assignedToCurrentUser;

                          return (
                            <button
                              key={locker.lockerNumber}
                              type='button'
                              disabled={disabled || Boolean(processing)}
                              onClick={() =>
                                setSelectedLockerNumber(locker.lockerNumber)
                              }
                              title={
                                disabled
                                  ? `Locker ${locker.lockerNumber} is occupied`
                                  : locker.assignedToCurrentUser
                                    ? `Your current locker ${locker.lockerNumber}`
                                    : `Select locker ${locker.lockerNumber}`
                              }
                              className={`h-10 rounded-lg border text-sm font-semibold transition ${
                                active
                                  ? 'border-[#11182B] bg-[#11182B] text-white'
                                  : locker.assignedToCurrentUser
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                    : disabled
                                      ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                      : 'border-slate-200 bg-white text-slate-700 hover:border-[#F4B740] hover:bg-[#F4B740]/10'
                              }`}
                            >
                              {locker.lockerNumber}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className='bg-white rounded-2xl border border-slate-200 shadow-sm p-6'>
            <h2 className='text-[17px] font-semibold text-slate-900 mb-4'>
              Payment method
            </h2>
            <InstitutePolicyNotice className='mb-4' compact />
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <PaymentMethodCard
                logo={razorpayLogo}
                title='Razorpay'
                detail='Pay online and activate instantly after backend verification.'
                buttonLabel={
                  processing === 'razorpay'
                    ? 'Opening...'
                    : paymentCooldown.isCoolingDown
                      ? `Wait ${paymentCooldown.remainingSeconds}s`
                      : 'Pay with Razorpay'
                }
                disabled={
                  !plan ||
                  loadingReservation ||
                  loadingLockers ||
                  lockerSelectionMissing ||
                  !hasMatchingSeatHold ||
                  Boolean(processing) ||
                  paymentCooldown.isCoolingDown ||
                  (Boolean(activeSubscription) &&
                    !canRenewActiveSubscription)
                }
                onClick={handleRazorpay}
              />
              <PaymentMethodCard
                logo={payOnDeskIcon}
                title='Pay on Desk'
                detail='Generate a reference and pay at the library desk. Activation happens after staff verification.'
                buttonLabel={
                  processing === 'desk'
                    ? 'Creating...'
                    : paymentCooldown.isCoolingDown
                      ? `Wait ${paymentCooldown.remainingSeconds}s`
                      : 'Generate reference'
                }
                disabled={
                  !plan ||
                  loadingReservation ||
                  loadingLockers ||
                  lockerSelectionMissing ||
                  !hasMatchingSeatHold ||
                  Boolean(processing) ||
                  paymentCooldown.isCoolingDown ||
                  (Boolean(activeSubscription) &&
                    !canRenewActiveSubscription)
                }
                onClick={handlePayOnDesk}
              />
            </div>

            {deskReference && (
              <div className='mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800'>
                <p className='font-semibold'>Desk payment reference created</p>
                <p className='mt-1'>
                  Reference ID:{' '}
                  <span className='font-mono'>{deskReference.referenceId}</span>
                </p>
                {deskReference.lockerNumber && (
                  <p className='mt-1'>
                    Locker: <span className='font-semibold'>{deskReference.lockerNumber}</span>
                  </p>
                )}
                <p className='mt-1'>
                  Show this reference at the library desk. Your subscription
                  will stay pending until staff verifies the payment.
                </p>
              </div>
            )}

            {error && (
              <div className='mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
                <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
                  <span>{error}</span>

                  {(error.includes('Select a seat') ||
                    error.includes('select the seat again')) && (
                    <button
                      type='button'
                      onClick={() =>
                        navigate('/book-seat', {
                          state: { selectedPlan: plan },
                        })
                      }
                      className='inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-white text-sm font-medium hover:bg-red-700 transition'
                    >
                      Select Seat
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className='bg-white rounded-2xl border border-slate-200 shadow-sm p-6 h-fit'>
          <h2 className='text-[17px] font-semibold text-slate-900 mb-4'>
            Payment history
          </h2>
          {loadingHistory ? (
            <p className='text-sm text-slate-500'>Loading payment history...</p>
          ) : payments.length === 0 ? (
            <p className='text-sm text-slate-500'>No payments found yet.</p>
          ) : (
            <div className='space-y-3'>
              {payments.map((payment) => (
                <PaymentHistoryItem key={payment._id} payment={payment} />
              ))}
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

function formatTimer(seconds) {
  if (seconds === null || seconds === undefined) return '5:00';
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const mins = Math.floor(safeSeconds / 60);
  const secs = String(safeSeconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function PaymentMethodCard({
  logo,
  title,
  detail,
  buttonLabel,
  disabled,
  onClick,
}) {
  return (
    <div className='rounded-2xl border border-slate-200 p-5 flex flex-col min-h-[220px]'>
      <div className='h-14 flex items-center'>
        <img
          src={logo}
          alt={title}
          className='max-h-12 max-w-[150px] object-contain'
        />
      </div>
      <h3 className='mt-4 text-base font-semibold text-slate-900'>{title}</h3>
      <p className='mt-1 text-sm text-slate-500 flex-1'>{detail}</p>
      <button
        type='button'
        disabled={disabled}
        onClick={onClick}
        className='mt-5 w-full rounded-lg bg-[#11182B] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1B2540] disabled:cursor-not-allowed disabled:opacity-60'
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function PaymentHistoryItem({ payment }) {
  return (
    <div className='rounded-xl border border-slate-200 p-3'>
      <div className='flex items-center justify-between gap-3'>
        <p className='text-sm font-semibold text-slate-900'>
          Rs. {payment.amount?.toLocaleString('en-IN') || 0}
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusClass(payment.status)}`}
        >
          {payment.status}
        </span>
      </div>
      <p className='mt-1 text-xs text-slate-500'>
        {formatMethod(payment.paymentMethod)}{' '}
        {payment.plan ? `- ${formatPlan(payment.plan)}` : ''}
      </p>
      {payment.lockerSelected && (
        <p className='mt-1 text-xs text-slate-500'>
          {payment.lockerNumber ? `Locker ${payment.lockerNumber}. ` : ''}
          {payment.lockerRent > 0
            ? `Includes locker rent Rs. ${(payment.lockerRent || LOCKER_RENT).toLocaleString('en-IN')}`
            : 'Locker selected'}
          {payment.lockerDeposit
            ? ` + refundable security Rs. ${payment.lockerDeposit.toLocaleString('en-IN')}`
            : ''}
        </p>
      )}
      <p className='mt-1 text-xs text-slate-400'>
        {formatDate(payment.paymentDate || payment.createdAt)}
      </p>
      {payment.referenceId && (
        <p className='mt-1 text-xs font-mono text-slate-500'>
          {payment.referenceId}
        </p>
      )}
    </div>
  );
}

function statusClass(status) {
  if (status === 'paid') return 'bg-emerald-100 text-emerald-700';
  if (status === 'failed') return 'bg-red-100 text-red-700';
  return 'bg-amber-100 text-amber-700';
}

function formatMethod(method) {
  return method === 'pay_on_desk' ? 'Pay on Desk' : 'Razorpay';
}

function formatPlan(plan) {
  return getPlan(plan)?.name || plan;
}

function formatSlot(slot) {
  if (slot === 'morning') return 'Morning (8:00 AM - 2:30 PM)';
  if (slot === 'evening') return 'Evening (3:00 PM - 8:30 PM)';
  if (slot === 'wholeDay') return 'Whole Day';
  return 'Full day';
}

function formatDate(value) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Failed to load Razorpay checkout'));
    document.body.appendChild(script);
  });
}

function openRazorpayCheckout({ order, onSuccess }) {
  return new Promise((resolve, reject) => {
    if (!window.Razorpay) {
      reject(new Error('Razorpay checkout is unavailable'));
      return;
    }

    const checkout = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: 'Bookshelf Library',
      description: `${order.plan.name} payment`,
      order_id: order.orderId,
      prefill: {
        name: order.user?.name || '',
        email: order.user?.email || '',
        contact: order.user?.phone || '',
      },
      theme: { color: '#11182B' },
      handler: async (response) => {
        try {
          await onSuccess(response);
          resolve();
        } catch (error) {
          reject(error);
        }
      },
      modal: {
        ondismiss: () => resolve(),
      },
    });

    checkout.open();
  });
}


