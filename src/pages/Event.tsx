import ImageSection from '@/components/ImageSection'
import Modal from '@/components/Modal'
import PageLayout from '@/layout/PageLayout'
import { EventifyService } from '@/service'
import { EventImagesResponse } from '@/service/types'
import JSZip from 'jszip'
import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const service = new EventifyService()
const zip = new JSZip()

const EventPage = () => {
    const { id: eventId } = useParams()
    const navigate = useNavigate()

    const [isPageLoading, setIsPageLoading] = useState<boolean>(false)
    const [imagesPath, setImagesPath] = useState<string[]>([])

    const [isModalOpen, setIsModalOpen] = useState(false)

    const [file, setFile] = useState<File | null>(null)

    const [isCompareLoading, setIsCompareLoading] = useState<boolean>(false)
    const [compareResponse, setCompareResponse] =
        useState<EventImagesResponse | null>(null)

    const openFindMeModal = () => setIsModalOpen(true)
    const closeFindMeModal = () => setIsModalOpen(false)

    useEffect(() => {
        async function getImages() {
            if (!eventId) {
                navigate('/')
                return
            }

            try {
                setIsPageLoading(true)
                const response = await service.getImagesForEvent(eventId)
                setImagesPath(response.images)
                setIsPageLoading(false)
            } catch (error) {
                console.error(error)
                setIsPageLoading(false)
            }
        }

        getImages()
    }, [])

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0])
        }
    }

    const downloadAllImages = async (imagesPath: string[]) => {
        try {
            const promises = imagesPath.map(async (img) => {
                const response = await fetch(img)
                const blob = await response.blob()

                const fileName = img.split('/').pop()
                if (fileName) {
                    zip.file(fileName, blob)
                }
            })

            await Promise.all(promises)

            const zipData = await zip.generateAsync({
                type: 'blob',
                streamFiles: true,
            })
            const link = document.createElement('a')
            link.href = window.URL.createObjectURL(zipData)
            link.download = `eventify-ai-${eventId}.zip`
            link.click()
        } catch (error) {
            console.error('error while downloading images:', error)
        }
    }

    const compareSelfieWithPhotos = async (e: FormEvent) => {
        e.preventDefault()

        if (!file || !eventId) {
            return
        }

        const formData = new FormData()
        formData.append('selfie', file)

        try {
            setIsCompareLoading(true)
            const response = await service.getImagesBySelfieForEvent(
                eventId,
                formData
            )
            setCompareResponse(response)
            setIsCompareLoading(false)
        } catch (error) {
            console.error(error)
            setCompareResponse(null)
            setIsCompareLoading(false)
        }
    }

    return (
        <PageLayout>
            {isPageLoading ? (
                <span>Loading...</span>
            ) : !compareResponse ? (
                <>
                    {imagesPath.length && (
                        <ImageSection imagesPath={imagesPath} />
                    )}
                    <div className="flex flex-col gap-4 lg:flex-row">
                        <button
                            className="rounded-lg border-2 px-4 py-2"
                            onClick={() => downloadAllImages(imagesPath)}
                        >
                            Download all
                        </button>
                        <button
                            className="rounded-lg border-2 px-4 py-2"
                            onClick={openFindMeModal}
                        >
                            Find me on the photos
                        </button>
                    </div>

                    <Modal isOpen={isModalOpen} onClose={closeFindMeModal}>
                        <h1 className="mb-4 text-center text-xl font-bold">
                            Find me on the photos
                        </h1>
                        {isCompareLoading ? (
                            <span>Loading...</span>
                        ) : (
                            <form className="flex flex-col items-center justify-center gap-4">
                                <div className="mb-4">
                                    <label
                                        htmlFor="photoInput"
                                        className="mb-2 block text-sm font-medium text-gray-700"
                                    >
                                        Please choose a selfie from your device
                                    </label>
                                    <input
                                        id="photoInput"
                                        type="file"
                                        accept="image/png, image/jpeg, image/jpg"
                                        onChange={handleFileChange}
                                        className="w-full text-sm text-gray-500 file:mr-4 file:rounded file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                                    />
                                </div>
                                <button
                                    className="flex rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                                    onClick={compareSelfieWithPhotos}
                                >
                                    Submit
                                </button>
                            </form>
                        )}
                    </Modal>
                </>
            ) : (
                <>
                    <span>{`Found ${compareResponse.images.length} match${compareResponse.images.length === 1 ? '' : 'es'}`}</span>
                    {imagesPath.length && (
                        <ImageSection imagesPath={compareResponse.images} />
                    )}

                    <div className="flex flex-col gap-4 lg:flex-row">
                        {compareResponse.images.length > 0 && (
                            <button
                                className="rounded-lg border-2 px-4 py-2"
                                onClick={() =>
                                    downloadAllImages(compareResponse.images)
                                }
                            >
                                Download all
                            </button>
                        )}
                        <button
                            className="rounded-lg border-2 px-4 py-2"
                            onClick={() => navigate(0)}
                        >
                            Try again
                        </button>
                    </div>
                </>
            )}
        </PageLayout>
    )
}

export default EventPage
