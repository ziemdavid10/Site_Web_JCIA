/** Erreur métier renvoyée telle quelle au client : { error: message, code } avec le statut HTTP. */
export class HttpError extends Error {
  constructor(status, message, code) {
    super(message)
    this.status = status
    this.code = code
  }
}
