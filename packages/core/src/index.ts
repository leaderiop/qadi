/**
 * The Effect-native authorization library: permission tokens, the role DAG, the
 * schema-derived policy ADT and the Effect evaluator, with the ports a policy
 * asks and the stream of decisions it makes.
 *
 * **The list below is the interface** (ADR-QD-047's amendment, ADR-QD-204): each
 * module's exports are named, modules in path order and, within a module, values
 * before types. A module's other names are reachable inside the package only: out
 * of the barrel means not importable (ADR-QD-099). Adding a name is a line here,
 * a row in `spec/overview.md` and a line in `test/surface.test.ts`, which is
 * deliberate.
 */
export {
  AttributeResolver,
  AttributeResolverNone,
  attributeResolverBounded,
  attributeResolverFromRecord,
  attributeResolverPort,
  attributeResolverRetrying,
  attributeResolverTimingOut,
} from "./AttributeResolver.ts";
export type { AttributeResolverShape } from "./AttributeResolver.ts";
export {
  anonymous,
  fromRoles,
  makeSubject,
  subjectEquivalence,
  withAttributes,
} from "./AuthSubject.ts";
export type { AuthSubject } from "./AuthSubject.ts";
export type { Authorized } from "./Authorized.ts";
export {
  CurrentSubject,
  CurrentSubjectAnonymous,
  currentSubjectLayer,
} from "./CurrentSubject.ts";
export {
  CustomPredicate,
  CustomPredicateNone,
  customPredicateBounded,
  customPredicateFromRecord,
  customPredicatePort,
  customPredicateRetrying,
  customPredicateTimingOut,
} from "./CustomPredicate.ts";
export type { CustomPredicateShape } from "./CustomPredicate.ts";
export {
  Allow,
  Deny,
  TraceSchema,
  decisionDisagreement,
  foldTrace,
  intersectFields,
  isAllowed,
  isAllowingTrace,
  isDenyingTrace,
  makeDecision,
  mergeFields,
  project,
  projectVisible,
  renderTrace,
  sameVisibleFields,
  unionFields,
} from "./Decision.ts";
export type {
  AllowingTrace,
  Decision,
  DecisionClaim,
  DecisionDisagreement,
  DecisionStamp,
  DenyingTrace,
  RenderTraceOptions,
  Trace,
  TraceCases,
  VisibleFields,
} from "./Decision.ts";
export { DecisionCache, decisionCacheLayer } from "./DecisionCache.ts";
export type { CacheLookup, DecisionCacheShape } from "./DecisionCache.ts";
export {
  ActedResult,
  DecisionHistory,
  DecisionHistoryUnknown,
  actedAnswerFromEvents,
  decisionHistoryBounded,
  decisionHistoryFromEvents,
  decisionHistoryPort,
  decisionHistoryRetrying,
  decisionHistoryTimingOut,
} from "./DecisionHistory.ts";
export type {
  ActedEventInput,
  ActedQuery,
  DecisionHistoryShape,
} from "./DecisionHistory.ts";
export { DEFAULT_LOG_CAPACITY, makeDecisionLog } from "./DecisionLog.ts";
export type {
  DecisionLog,
  DecisionLogEntries,
  DecisionLogRead,
  DecisionLogReader,
  LogCursor,
  LogEntry,
} from "./DecisionLog.ts";
export {
  Decided,
  DecisionRecord,
  Failed,
  ObligationRecord,
  StoredRecord,
  sinkRecordOrder,
  storedRecordOrder,
} from "./DecisionRecord.ts";
export type { DecisionOutcome, ObligationOutcome, SinkRecord } from "./DecisionRecord.ts";
export { DecisionSink } from "./DecisionSink.ts";
export type { DecisionSinkShape } from "./DecisionSink.ts";
export { decisionSinkAll, decisionSinkForwarding } from "./DecisionSinkForwarding.ts";
export {
  DecisionStreamEvent,
  DecisionStreamSynced,
  decodeDecisionStream,
  encodeDecisionStream,
  formatLogCursor,
  parseLogCursor,
} from "./DecisionStream.ts";
export type {
  DecisionRecordEvent,
  DecisionStreamFrame,
  DecisionStreamRead,
  EncodeDecisionStreamOptions,
  ReceivedFrame,
} from "./DecisionStream.ts";
export {
  DecisionWire,
  DecisionWireAllow,
  DecisionWireDeny,
  decodeDecision,
  encodeDecision,
} from "./DecisionWire.ts";
export { reportEncodeRefusal } from "./EncodeRefusalReport.ts";
export {
  AccessDenied,
  AccessDeniedPublic,
  AttributeResolveError,
  CircularRoleInheritance,
  CustomPredicateError,
  DecisionHistoryUnavailable,
  DuplicateRoleDefinition,
  ENFORCEMENT_DENIAL_TAGS,
  ENFORCEMENT_ERROR_CLASSES,
  ENFORCEMENT_ERROR_TAGS,
  ERROR_CODES,
  InvalidBoundedPermits,
  InvalidPermissionSegment,
  MissingAction,
  MissingResource,
  MissingResourceId,
  PolicyNotTranslatable,
  PolicyTooDeep,
  PredicateNotRenderable,
  RelationshipResolveError,
  SignatureHistoryUnavailable,
  SinkRecordNotDecodable,
  SinkRecordNotEncodable,
  UndischargedObligation,
  classifyEnforcementError,
  errorCode,
  toAccessDeniedPublic,
} from "./Errors.ts";
export type {
  EnforcementDenial,
  EnforcementError,
  EnforcementErrorClass,
  EnforcementErrorClassTable,
  EnforcementErrorTagOf,
  EvaluationError,
  QadiError,
  RenderRefusal,
} from "./Errors.ts";
export { evaluate } from "./Evaluate.ts";
export { evaluationEnvironment } from "./EvaluationEnvironment.ts";
export type {
  EvaluationClock,
  EvaluationEnvironmentOptions,
  EvaluationShadowing,
} from "./EvaluationEnvironment.ts";
export {
  EvaluationId,
  EvaluationIdLive,
  evaluationIdSequential,
} from "./EvaluationId.ts";
export type { EvaluationIdShape } from "./EvaluationId.ts";
export {
  decisionCacheLookupsTotal,
  decisionsTotal,
  denialsByPolicyTagTotal,
  evaluationDurationMillis,
  evaluationErrorsTotal,
  predicatesTranslatedTotal,
} from "./EvaluationMetrics.ts";
export type { CacheOutcome } from "./EvaluationMetrics.ts";
export type {
  EvaluationServices,
  StandingEvaluationServices,
} from "./EvaluationServices.ts";
export { EvaluationServicesNone } from "./EvaluationServicesNone.ts";
export {
  explain,
  foldAligned,
  foldExplanation,
  foldExplanationCases,
  renderExplanation,
} from "./Explanation.ts";
export type {
  AlignedNode,
  All,
  Any,
  Explanation,
  ExplanationCases,
  Named,
  Negated,
  Owing,
  RenderOptions,
  Requirement,
  RequirementKind,
  Row,
  RowResult,
  Table,
} from "./Explanation.ts";
export { gateStates, isGateState } from "./GateState.ts";
export type { GateState } from "./GateState.ts";
export { createGuardHealthCheck } from "./GuardHealthCheck.ts";
export type { GuardHealthCheckResult } from "./GuardHealthCheck.ts";
export {
  hydrationDehydratedTotal,
  hydrationDropMeaning,
  hydrationDropReasons,
  hydrationDroppedTotal,
  hydrationMismatchesTotal,
  hydrationRechecksTotal,
  hydrationSeededTotal,
  isHydrationDropReason,
} from "./HydrationMetrics.ts";
export type {
  ClientHydrationDropReason,
  DehydrationDropReason,
  HydrationDropMeaning,
  HydrationDropReason,
  HydrationDropReasonOf,
  HydrationDropRow,
} from "./HydrationMetrics.ts";
export {
  ResourceIdSchema,
  SUBJECT_ID_TAG,
  SubjectIdSchema,
  makeResourceId,
  makeSubjectId,
} from "./Identity.ts";
export type { ResourceId, SubjectId } from "./Identity.ts";
export {
  EncodeRefusal,
  describeEncodeRefusal,
  encodeRefusalAnnotations,
  encodeRefusalPath,
} from "./JsonRefusal.ts";
export type {
  EncodeRefusalAnnotations,
  OpaqueKind,
  UnrepresentableKind,
  WirePath,
} from "./JsonRefusal.ts";
export {
  Matcher,
  ValueRef,
  action,
  contains,
  dominates,
  eq,
  evaluateMatcher,
  everyMatch,
  exists,
  fieldMatch,
  foldMatcher,
  foldMatcherCases,
  getByPath,
  gte,
  inArray,
  judgeMatcher,
  leafMatcherCases,
  literal,
  lt,
  matcherDepth,
  neq,
  referencesAction,
  referencesResource,
  resource,
  size,
  someMatch,
  subject,
  subjectId,
} from "./Matcher.ts";
export type { LeafMatcher, MatcherCases, MatcherContext, Verdict } from "./Matcher.ts";
export {
  Obligation,
  bindingObligations,
  obligation,
  unionObligations,
} from "./Obligation.ts";
export type { ObligationOptions } from "./Obligation.ts";
export {
  PermissionSchema,
  SEGMENT_PATTERN,
  createPermissionGroup,
  isValidSegment,
  permission,
  permissionKey,
} from "./Permission.ts";
export type {
  InferAction,
  InferKey,
  InferResource,
  Permission,
  PermissionGroup,
  PermissionKey,
} from "./Permission.ts";
export {
  ActionName,
  Combining,
  DEFAULT_MAX_DEPTH,
  EventName,
  FieldStrategy,
  HistoryScope,
  LabelName,
  POLICY_TAGS,
  Policy,
  PolicyDecodeTooDeep,
  PolicyNotJson,
  RelationName,
  RelationshipDepth,
  RoleName,
  RuleEffect,
  allOf,
  allOfRoles,
  anyOf,
  anyOfRoles,
  childrenOf,
  defaultFieldStrategy,
  denyWhen,
  fieldsOf,
  foldPolicy,
  foldPolicyCases,
  fromJson,
  fromJsonValue,
  hasActed,
  hasAction,
  hasAttribute,
  hasCustom,
  hasNotActed,
  hasPermission,
  hasRelationship,
  hasResourceAttribute,
  hasRole,
  hasSignature,
  labeled,
  leafCases,
  makeRoleName,
  not,
  obliged,
  permitWhen,
  policyDepth,
  rules,
  toJson,
  toJsonValue,
} from "./Policy.ts";
export type {
  CombinatorOptions,
  FieldOptions,
  HistoryOptions,
  LeafPolicy,
  PolicyCases,
  PolicyEncoded,
  Rule,
  RuleEncoded,
  RuleResult,
  SignatureOptions,
} from "./Policy.ts";
export {
  KeyRefusal,
  PortReply,
  describeKeyRefusal,
  isPortDefault,
} from "./PortDescription.ts";
export type {
  LeafOf,
  LeafRequests,
  PortDescription,
  PortScript,
  PortShape,
  ReadSite,
  UnkeyableKind,
} from "./PortDescription.ts";
export { recordingPort, replyTable, scriptedPort } from "./PortDoubles.ts";
export type { PortDouble } from "./PortDoubles.ts";
export {
  portCallsTotal,
  portRetriesTotal,
  portTimeoutsTotal,
  predicatePortCallsTotal,
  servedPortCallsTotal,
} from "./PortMetrics.ts";
export type { PredicatePortName } from "./PortMetrics.ts";
export { PORT_NAMES } from "./PortName.ts";
export type { PortName } from "./PortName.ts";
export { answerRemotely, askRemotely, remotePorts, servingFor } from "./PortRemote.ts";
export type { PortServing, PortServingFacet, PortServingOf } from "./PortServing.ts";
export type {
  PortInterpreter,
  PortSpanAttributes,
  PortSpanAttributesLike,
  PortSpanRow,
  PortSpanRowOf,
  SpanFields,
  SpanKey,
  SpanStruct,
  SpanType,
  SpanValue,
} from "./PortSpan.ts";
export { decodePortSpan } from "./PortSpanEncode.ts";
export {
  PortWireRefusal,
  PortWireReply,
  RemotePortError,
  RemotePortFailure,
  describeRemotePortFailure,
} from "./PortWire.ts";
export type { DecodedQuestion, PortWire } from "./PortWire.ts";
export {
  PORTS,
  PORT_FIXTURES,
  decoratePorts,
  fixturePortsLayer,
  forEveryPort,
  mergePorts,
  portsLayer,
  tabulatePorts,
} from "./Ports.ts";
export type {
  AnswerOf,
  ArgsOf,
  AskedOf,
  DescriptionOf,
  ErrorOf,
  PortDecorator,
  PortFixtureData,
  PortFixtures,
  PortLayerVisitor,
  PortLayers,
  PortOverrides,
  PortServices,
  PortSpanName,
  PortSpanOf,
  PortTypes,
  PortVisitor,
  ServiceOf,
  ShapeOf,
  SpanOf,
} from "./Ports.ts";
export { evaluatePredicate, toPredicate } from "./Predicate.ts";
export type {
  CompareOp,
  Predicate,
  PredicateOptions,
  PredicateServices,
} from "./Predicate.ts";
export {
  isRangeBound,
  isRenderableIdentifier,
  isSafeLiteral,
} from "./PredicateLiteral.ts";
export type { IdentifierRule, SafeLiteral } from "./PredicateLiteral.ts";
export {
  assert,
  check,
  decide,
  enforce,
  enforceLoaded,
  enforceProjected,
  enforceProjectedLoaded,
  filter,
  filterProjected,
  filterStream,
  filterStreamProjected,
  guard,
} from "./Qadi.ts";
export type {
  EnforceOptions,
  HandoverOptions,
  ObligationDischarge,
  ObligationHandler,
} from "./Qadi.ts";
export { questionOf } from "./Question.ts";
export type { EvaluateOptions, Question, QuestionOptions } from "./Question.ts";
export {
  RelatedResult,
  RelationshipEdge,
  RelationshipResolver,
  RelationshipResolverNever,
  relationshipResolverBounded,
  relationshipResolverFromEdges,
  relationshipResolverPort,
  relationshipResolverRetrying,
  relationshipResolverTimingOut,
} from "./RelationshipResolver.ts";
export type {
  RelationshipCheck,
  RelationshipEdgeInput,
  RelationshipResolverShape,
} from "./RelationshipResolver.ts";
export {
  DEFAULT_MAX_IN_VALUES,
  compilePredicate,
  toRenderable,
} from "./RenderablePredicate.ts";
export type {
  ColumnFiniteness,
  ColumnNullability,
  CompileOutcomes,
  CompilePredicateOptions,
  EqualityLiteral,
  FiniteExclusion,
  FiniteGuard,
  Negation,
  NullGuard,
  RenderRules,
  RenderableNode,
} from "./RenderablePredicate.ts";
export { resourceIdOf } from "./Resource.ts";
export type { Resource } from "./Resource.ts";
export {
  RoleStep,
  flattenAll,
  flattenPermissions,
  permissionProvenance,
  resolveRoleGraph,
  role,
  roleNames,
  roleWalk,
} from "./Role.ts";
export type { PermissionGrant, Role, RoleDefinition } from "./Role.ts";
export {
  compareLabels,
  isSecurityLabel,
  join,
  labelDominates,
  meet,
} from "./SecurityLabel.ts";
export type { LabelOrdering, SecurityLabel } from "./SecurityLabel.ts";
export { SIGNATURE_MEANINGS, Signature } from "./Signature.ts";
export type { SignatureMeaning } from "./Signature.ts";
export {
  SignatureHistory,
  SignatureHistoryNone,
  signatureAnswerFromSignatures,
  signatureHistoryBounded,
  signatureHistoryFromSignatures,
  signatureHistoryPort,
  signatureHistoryRetrying,
  signatureHistoryTimingOut,
} from "./SignatureHistory.ts";
export type {
  SignatureAnswer,
  SignatureHistoryShape,
  SignatureInput,
  SignatureQuery,
} from "./SignatureHistory.ts";
export { simplify } from "./Simplify.ts";
export {
  SinkRecordJson,
  StoredRecordJson,
  decodeSinkRecord,
  decodeSinkRecordString,
  decodeSinkRecordWithJson,
  decodeStoredRecord,
  decodeStoredRecordString,
  encodeSinkRecord,
  encodeSinkRecordString,
  encodeStoredRecord,
  encodeStoredRecordString,
} from "./SinkCodec.ts";
export type { DecodedSinkRecord } from "./SinkCodec.ts";
export {
  DecodeRefusal,
  WIRE_VERSION,
  WIRE_VERSIONS,
  decodeRefusalAnnotations,
  decodeRefusalOf,
  describeDecodeRefusal,
} from "./SinkWire.ts";
export type { DecodeRefusalAnnotations, SinkRecordTag, WireVersion } from "./SinkWire.ts";
export {
  FilteredSubjectOutcome,
  SubjectOutcome,
  decideSubject,
  decideSubjects,
  decideSubjectsStream,
  filterSubjects,
  filterSubjectsStream,
} from "./SubjectSet.ts";
export type {
  FilteredSubjects,
  SubjectDecision,
  SubjectEvaluationFailure,
  SubjectSetOutcome,
  SubjectSetServices,
} from "./SubjectSet.ts";
export { causeMessage, thrownMessage } from "./ThrownMessage.ts";
export { diffTraces, flippedAt, tracePathKey } from "./TraceDiff.ts";
export type {
  ChildCountChanged,
  FieldsChanged,
  LabelChanged,
  ObligationsChanged,
  PolicyTagChanged,
  ReasonChanged,
  TraceDifference,
  TracePath,
  VerdictChanged,
} from "./TraceDiff.ts";
export {
  MAX_DECODE_DEPTH,
  UntrustedRefusal,
  untrustedDecoder,
} from "./UntrustedDecode.ts";
export type {
  UnknownKeyPolicy,
  UntrustedDecoder,
  UntrustedDecoderOptions,
  UntrustedValueRefusal,
  UnwalkedKey,
} from "./UntrustedDecode.ts";
export { valueLabel, valueText } from "./ValueText.ts";
